// ===== FILE: src/modules/konflik/konflik.controller.ts =====
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { KonfikService } from './konflik.service';
import { CreateKonfikDto } from './dto/create-konflik.dto';
import { UpdateKonfikDto } from './dto/update-konflik.dto';
import { QueryKonfikDto } from './dto/query-konflik.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Pemeriksaan Konflik')
@ApiBearerAuth()
@Controller('konflik')
@UseGuards(RolesGuard)
export class KonfikController {
  constructor(private readonly konfikService: KonfikService) {}

  @Post()
  @Roles(UserRole.admin, UserRole.advokat)
  @ApiOperation({ summary: 'Buat pemeriksaan konflik baru' })
  @ApiResponse({
    status: 201,
    description: 'Pemeriksaan konflik berhasil dibuat',
  })
  create(@Body() dto: CreateKonfikDto, @CurrentUser('id') userId: string) {
    return this.konfikService.create(dto, userId);
  }

  @Get()
  @Roles(UserRole.admin, UserRole.advokat)
  @ApiOperation({ summary: 'Get semua pemeriksaan konflik dengan pagination' })
  @ApiResponse({
    status: 200,
    description: 'Data pemeriksaan konflik berhasil diambil',
  })
  findAll(@Query() query: QueryKonfikDto) {
    return this.konfikService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.admin, UserRole.advokat)
  @ApiOperation({ summary: 'Get detail pemeriksaan konflik by ID' })
  @ApiResponse({
    status: 200,
    description: 'Detail pemeriksaan konflik berhasil diambil',
  })
  findOne(@Param('id') id: string) {
    return this.konfikService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.advokat)
  @ApiOperation({ summary: 'Update pemeriksaan konflik by ID' })
  @ApiResponse({
    status: 200,
    description: 'Pemeriksaan konflik berhasil diupdate',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateKonfikDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.konfikService.update(id, dto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Hapus pemeriksaan konflik by ID' })
  @ApiResponse({
    status: 200,
    description: 'Pemeriksaan konflik berhasil dihapus',
  })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.konfikService.remove(id, userId);
  }
}
