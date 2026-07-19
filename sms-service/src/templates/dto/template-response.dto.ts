import { Template } from '../entities/template.entity';

export class TemplateResponseDto {
  id: number;
  name: string;
  body: string;
  variables: string[];
  org_id: number | null;
  created_at: string;
  updated_at: string;

  static fromEntity(entity: Template): TemplateResponseDto {
    const dto = new TemplateResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.body = entity.body;
    dto.variables = entity.variables;
    dto.org_id = entity.orgId;
    dto.created_at = entity.createdAt.toISOString();
    dto.updated_at = entity.updatedAt.toISOString();
    return dto;
  }
}
