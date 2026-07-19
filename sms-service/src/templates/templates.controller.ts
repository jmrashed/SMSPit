import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateResponseDto } from './dto/template-response.dto';
import { TemplatesService } from './templates.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Controller('templates')
@UseGuards(ApiKeyGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTemplateDto, @Req() request: Request): Promise<TemplateResponseDto> {
    const template = await this.templatesService.create(dto, request.apiKey!.org_id);
    return TemplateResponseDto.fromEntity(template);
  }

  @Get()
  async findAll(@Req() request: Request): Promise<{ templates: TemplateResponseDto[] }> {
    const templates = await this.templatesService.findAll(request.apiKey!.org_id);
    return { templates: templates.map(TemplateResponseDto.fromEntity) };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() request: Request): Promise<TemplateResponseDto> {
    const template = await this.templatesService.findOne(id, request.apiKey!.org_id);
    return TemplateResponseDto.fromEntity(template);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTemplateDto,
    @Req() request: Request,
  ): Promise<TemplateResponseDto> {
    const template = await this.templatesService.update(id, dto, request.apiKey!.org_id);
    return TemplateResponseDto.fromEntity(template);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() request: Request): Promise<void> {
    await this.templatesService.remove(id, request.apiKey!.org_id);
  }
}
