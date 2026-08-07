import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Roles } from '../../auth/decorators/roles.decorator';
import { CreateThemeDto, UpdateThemeDto } from './dto';
import { AdminThemesService } from './admin-themes.service';

@ApiTags('admin/themes')
@Controller('admin/themes')
@Roles('ADMIN')
export class AdminThemesController {
  constructor(private readonly adminThemesService: AdminThemesService) {}

  @Get()
  findAll() {
    return this.adminThemesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminThemesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateThemeDto) {
    return this.adminThemesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateThemeDto) {
    return this.adminThemesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.adminThemesService.remove(id);
  }
}
