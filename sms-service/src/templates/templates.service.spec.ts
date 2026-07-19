import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { TemplatesService } from './templates.service';
import { Template } from './entities/template.entity';

describe('TemplatesService', () => {
  let service: TemplatesService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOneBy: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOneBy: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplatesService, { provide: getRepositoryToken(Template), useValue: repository }],
    }).compile();

    service = module.get(TemplatesService);
  });

  it('creates a template scoped to the acting org, defaulting variables to []', async () => {
    repository.create.mockImplementation((entity: Partial<Template>) => entity as Template);
    repository.save.mockImplementation((entity: Template) => Promise.resolve(entity));

    const result = await service.create({ name: 'OTP', body: 'Your OTP is {{otp}}' }, 42);

    expect(result.name).toBe('OTP');
    expect(result.variables).toEqual([]);
    expect(result.orgId).toBe(42);
  });

  it('keeps explicitly provided variables', async () => {
    repository.create.mockImplementation((entity: Partial<Template>) => entity as Template);
    repository.save.mockImplementation((entity: Template) => Promise.resolve(entity));

    const result = await service.create({ name: 'OTP', body: 'Your OTP is {{otp}}', variables: ['otp'] }, 42);

    expect(result.variables).toEqual(['otp']);
  });

  it('lists templates scoped to the acting org', async () => {
    repository.find.mockResolvedValue([]);

    await service.findAll(42);

    expect(repository.find).toHaveBeenCalledWith({ where: { orgId: 42 }, order: { createdAt: 'DESC' } });
  });

  it('scopes to a null org_id ("ungrouped") using IS NULL', async () => {
    repository.find.mockResolvedValue([]);

    await service.findAll(null);

    expect(repository.find).toHaveBeenCalledWith({ where: { orgId: IsNull() }, order: { createdAt: 'DESC' } });
  });

  it('throws NotFoundException for a template in a different org', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne(1, 999)).rejects.toThrow(NotFoundException);
  });

  it('updates only the provided fields', async () => {
    const existing: Template = {
      id: 1,
      name: 'OTP',
      body: 'Your OTP is {{otp}}',
      variables: ['otp'],
      orgId: 42,
      createdAt: new Date('2026-07-20T00:00:00.000Z'),
      updatedAt: new Date('2026-07-20T00:00:00.000Z'),
    };
    repository.findOneBy.mockResolvedValue(existing);
    repository.save.mockImplementation((entity: Template) => Promise.resolve(entity));

    const result = await service.update(1, { name: 'OTP v2' }, 42);

    expect(result.name).toBe('OTP v2');
    expect(result.body).toBe('Your OTP is {{otp}}');
    expect(result.variables).toEqual(['otp']);
  });

  it('deletes a template scoped to the acting org', async () => {
    const existing: Template = {
      id: 1,
      name: 'OTP',
      body: 'Your OTP is {{otp}}',
      variables: ['otp'],
      orgId: 42,
      createdAt: new Date('2026-07-20T00:00:00.000Z'),
      updatedAt: new Date('2026-07-20T00:00:00.000Z'),
    };
    repository.findOneBy.mockResolvedValue(existing);

    await service.remove(1, 42);

    expect(repository.remove).toHaveBeenCalledWith(existing);
  });

  it('does not delete a template belonging to a different org', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
    expect(repository.remove).not.toHaveBeenCalled();
  });
});
