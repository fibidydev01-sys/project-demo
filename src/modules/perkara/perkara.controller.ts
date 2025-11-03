// ============================================================================
// FILE: server/src/modules/perkara/perkara.controller.ts - WITH RBAC
// ============================================================================
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
import { PerkaraService } from './perkara.service';
import { CreatePerkaraDto } from './dto/create-perkara.dto';
import { UpdatePerkaraDto } from './dto/update-perkara.dto';
import { QueryPerkaraDto } from './dto/query-perkara.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Perkara')
@ApiBearerAuth()
@Controller('perkara')
@UseGuards(RolesGuard)
export class PerkaraController {
  constructor(private readonly perkaraService: PerkaraService) {}

  @Post()
  @Roles(UserRole.admin, UserRole.advokat)
  @ApiOperation({ summary: 'Buat perkara baru' })
  @ApiResponse({ status: 201, description: 'Perkara berhasil dibuat' })
  create(@Body() dto: CreatePerkaraDto, @CurrentUser('id') userId: string) {
    return this.perkaraService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get semua perkara dengan pagination' })
  @ApiResponse({ status: 200, description: 'Data perkara berhasil diambil' })
  findAll(
    @Query() query: QueryPerkaraDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole, // ✅ AMBIL ROLE
  ) {
    return this.perkaraService.findAll(query, userId, userRole);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detail perkara by ID' })
  @ApiResponse({ status: 200, description: 'Detail perkara berhasil diambil' })
  findOne(@Param('id') id: string) {
    return this.perkaraService.findOne(id);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get statistik perkara' })
  @ApiResponse({ status: 200, description: 'Statistik berhasil diambil' })
  getStatistics(@Param('id') id: string) {
    return this.perkaraService.getStatistics(id);
  }

  @Patch(':id')
  @Roles(UserRole.admin, UserRole.advokat)
  @ApiOperation({ summary: 'Update perkara by ID' })
  @ApiResponse({ status: 200, description: 'Perkara berhasil diupdate' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePerkaraDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.perkaraService.update(id, dto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Hapus perkara by ID' })
  @ApiResponse({ status: 200, description: 'Perkara berhasil dihapus' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.perkaraService.remove(id, userId);
  }
}
