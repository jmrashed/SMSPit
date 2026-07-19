import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { Template } from './entities/template.entity';

// TypeORM's FindOptionsWhere type for a nullable numeric column doesn't
// accept a plain `null` -- same reasoning as MessagesService.orgWhere.
function orgWhere(orgId: number | null): number | ReturnType<typeof IsNull> {
  return orgId === null ? IsNull() : orgId;
}

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectRepository(Template)
    private readonly templatesRepository: Repository<Template>,
  ) {}

  async create(dto: CreateTemplateDto, orgId: number | null): Promise<Template> {
    const template = this.templatesRepository.create({
      name: dto.name,
      body: dto.body,
      variables: dto.variables ?? [],
      orgId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.templatesRepository.save(template);
  }

  async findAll(orgId: number | null): Promise<Template[]> {
    return this.templatesRepository.find({
      where: { orgId: orgWhere(orgId) },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, orgId: number | null): Promise<Template> {
    const template = await this.templatesRepository.findOneBy({ id, orgId: orgWhere(orgId) });

    if (!template) {
      this.logger.warn(`Template ${id} not found`);
      throw new NotFoundException(`Template ${id} not found`);
    }

    return template;
  }

  async update(id: number, dto: UpdateTemplateDto, orgId: number | null): Promise<Template> {
    const template = await this.findOne(id, orgId);

    if (dto.name !== undefined) template.name = dto.name;
    if (dto.body !== undefined) template.body = dto.body;
    if (dto.variables !== undefined) template.variables = dto.variables;
    template.updatedAt = new Date();

    return this.templatesRepository.save(template);
  }

  async remove(id: number, orgId: number | null): Promise<void> {
    const template = await this.findOne(id, orgId);
    await this.templatesRepository.remove(template);
  }
}
