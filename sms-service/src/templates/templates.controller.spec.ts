import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { Template } from './entities/template.entity';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { AuthClient } from '../auth/auth-client';

function fakeRequest(orgId: number | null = 42): Request {
  return { apiKey: { id: 1, name: 'test', owner_id: 1, org_id: orgId, scopes: [] } } as unknown as Request;
}

describe('TemplatesController', () => {
  let controller: TemplatesController;
  let service: { create: jest.Mock; findAll: jest.Mock; findOne: jest.Mock; update: jest.Mock; remove: jest.Mock };

  beforeEach(async () => {
    service = { create: jest.fn(), findAll: jest.fn(), findOne: jest.fn(), update: jest.fn(), remove: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [
        { provide: TemplatesService, useValue: service },
        ApiKeyGuard,
        { provide: AuthClient, useValue: { validateToken: jest.fn() } },
      ],
    }).compile();

    controller = module.get(TemplatesController);
  });

  const entity: Template = {
    id: 1,
    name: 'OTP',
    body: 'Your OTP is {{otp}}',
    variables: ['otp'],
    orgId: 42,
    createdAt: new Date('2026-07-20T00:00:00.000Z'),
    updatedAt: new Date('2026-07-20T00:00:00.000Z'),
  };

  it('creates a template scoped to the acting org', async () => {
    service.create.mockResolvedValue(entity);

    const result = await controller.create({ name: 'OTP', body: 'Your OTP is {{otp}}', variables: ['otp'] }, fakeRequest());

    expect(service.create).toHaveBeenCalledWith({ name: 'OTP', body: 'Your OTP is {{otp}}', variables: ['otp'] }, 42);
    expect(result).toEqual({
      id: 1,
      name: 'OTP',
      body: 'Your OTP is {{otp}}',
      variables: ['otp'],
      org_id: 42,
      created_at: '2026-07-20T00:00:00.000Z',
      updated_at: '2026-07-20T00:00:00.000Z',
    });
  });

  it('lists templates scoped to the acting org', async () => {
    service.findAll.mockResolvedValue([entity]);

    const result = await controller.findAll(fakeRequest());

    expect(service.findAll).toHaveBeenCalledWith(42);
    expect(result.templates).toHaveLength(1);
    expect(result.templates[0].id).toBe(1);
  });

  it('returns a single template by id', async () => {
    service.findOne.mockResolvedValue(entity);

    const result = await controller.findOne(1, fakeRequest());

    expect(service.findOne).toHaveBeenCalledWith(1, 42);
    expect(result.id).toBe(1);
  });

  it('propagates NotFoundException for an unknown id', async () => {
    service.findOne.mockRejectedValue(new NotFoundException('Template 999 not found'));

    await expect(controller.findOne(999, fakeRequest())).rejects.toThrow(NotFoundException);
  });

  it('updates a template', async () => {
    service.update.mockResolvedValue({ ...entity, name: 'OTP v2' });

    const result = await controller.update(1, { name: 'OTP v2' }, fakeRequest());

    expect(service.update).toHaveBeenCalledWith(1, { name: 'OTP v2' }, 42);
    expect(result.name).toBe('OTP v2');
  });

  it('deletes a template', async () => {
    service.remove.mockResolvedValue(undefined);

    await controller.remove(1, fakeRequest());

    expect(service.remove).toHaveBeenCalledWith(1, 42);
  });
});
