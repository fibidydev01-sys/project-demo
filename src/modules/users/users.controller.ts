// ===== FILE: src/modules/users/users.controller.ts (100% TYPE-SAFE) =====
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
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { ToggleStatusDto } from './dto/toggle-status.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { BulkChangeRoleDto } from './dto/bulk-change-role.dto';
import { ExportUsersDto } from './dto/export-users.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { LogAktivitasService } from '../log-aktivitas/log-aktivitas.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly logAktivitasService: LogAktivitasService,
  ) {}

  @Post()
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Buat user baru' })
  @ApiResponse({ status: 201, description: 'User berhasil dibuat' })
  create(@Body() dto: CreateUserDto, @CurrentUser('id') userId: string) {
    return this.usersService.create(dto, userId);
  }

  @Get()
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Get semua users dengan pagination' })
  @ApiResponse({ status: 200, description: 'Data users berhasil diambil' })
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get('statistics')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Get team statistics' })
  @ApiResponse({ status: 200, description: 'Team statistics retrieved' })
  getStatistics() {
    return this.usersService.getTeamStatistics();
  }

  @Get('workload-distribution')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Get workload distribution across team' })
  @ApiResponse({ status: 200, description: 'Workload distribution retrieved' })
  getWorkloadDistribution() {
    return this.usersService.getWorkloadDistribution();
  }

  @Get('import-template')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Download CSV template for bulk import' })
  @ApiResponse({ status: 200, description: 'CSV template downloaded' })
  downloadTemplate(@Res() res: Response): void {
    const csv = [
      'email,nama_lengkap,role,jabatan,telepon',
      'john.doe@example.com,John Doe,advokat,Senior Partner,081234567890',
      'jane.smith@example.com,Jane Smith,paralegal,Paralegal,081298765432',
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=user-import-template.csv',
    );
    res.send(csv);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detail user by ID' })
  @ApiResponse({ status: 200, description: 'Detail user berhasil diambil' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Get user activity logs' })
  @ApiResponse({ status: 200, description: 'Activity logs retrieved' })
  getUserActivity(
    @Param('id') userId: string,
    @Query() query: { page?: number; limit?: number },
  ) {
    return this.logAktivitasService.findByUser(userId, query);
  }

  @Patch(':id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiResponse({ status: 200, description: 'User berhasil diupdate' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.update(id, dto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Hapus user by ID' })
  @ApiResponse({ status: 200, description: 'User berhasil dihapus' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.usersService.remove(id, userId);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.admin)
  @ApiOperation({
    summary: 'Reset user password (generate temporary password)',
  })
  @ApiResponse({
    status: 200,
    description: 'Password berhasil direset',
    schema: {
      type: 'object',
      properties: {
        temporary_password: { type: 'string', example: 'a3f8b2c9d1' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User tidak ditemukan' })
  resetPassword(@Param('id') id: string) {
    return this.usersService.resetUserPassword(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Toggle user active status' })
  @ApiResponse({ status: 200, description: 'Status berhasil diubah' })
  @ApiResponse({ status: 404, description: 'User tidak ditemukan' })
  toggleStatus(@Param('id') id: string, @Body() dto: ToggleStatusDto) {
    return this.usersService.toggleUserStatus(id, dto.active);
  }

  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Avatar berhasil diupload',
    schema: {
      type: 'object',
      properties: {
        avatar_url: {
          type: 'string',
          example: '/uploads/avatars/user-123_1234567890.jpg',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'File tidak valid' })
  @ApiResponse({ status: 404, description: 'User tidak ditemukan' })
  uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(id, file);
  }

  @Delete(':id/avatar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user avatar' })
  @ApiResponse({ status: 204, description: 'Avatar berhasil dihapus' })
  @ApiResponse({ status: 400, description: 'User tidak memiliki avatar' })
  @ApiResponse({ status: 404, description: 'User tidak ditemukan' })
  async deleteAvatar(@Param('id') id: string) {
    await this.usersService.deleteAvatar(id);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Bulk delete users' })
  @ApiResponse({
    status: 200,
    description: 'Bulk delete operation completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'number', example: 3 },
        failed: { type: 'number', example: 1 },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              user_id: { type: 'string' },
              email: { type: 'string' },
              reason: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid user IDs' })
  bulkDelete(
    @Body() dto: BulkDeleteDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.usersService.bulkDeleteUsers(dto.user_ids, currentUserId);
  }

  @Post('bulk-change-role')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Bulk change user roles' })
  @ApiResponse({ status: 200, description: 'Bulk role change completed' })
  @ApiResponse({ status: 400, description: 'Invalid user IDs or role' })
  bulkChangeRole(
    @Body() dto: BulkChangeRoleDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.usersService.bulkChangeRole(
      dto.user_ids,
      dto.role,
      currentUserId,
    );
  }

  @Post(':id/send-invitation')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Send invitation email to user' })
  @ApiResponse({
    status: 200,
    description: 'Invitation email sent',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Invitation email sent successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  sendInvitation(@Param('id') id: string) {
    return this.usersService.sendInvitationEmail(id);
  }

  @Post(':id/resend-invitation')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Resend invitation email to user' })
  @ApiResponse({ status: 200, description: 'Invitation email resent' })
  @ApiResponse({ status: 404, description: 'User not found' })
  resendInvitation(@Param('id') id: string) {
    return this.usersService.resendInvitationEmail(id);
  }

  @Post('bulk-import')
  @Roles(UserRole.admin)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk import users from CSV' })
  @ApiResponse({
    status: 201,
    description: 'Bulk import completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'number', example: 5 },
        failed: { type: 'number', example: 1 },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              row: { type: 'number' },
              email: { type: 'string' },
              reason: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async bulkImport(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.usersService.bulkImportUsers(file, userId);
  }

  @Post('export')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Export users to CSV/Excel' })
  @ApiResponse({ status: 200, description: 'Users exported successfully' })
  async exportUsers(
    @Body() dto: ExportUsersDto,
    @Res() res: Response,
  ): Promise<void> {
    const { format, filters } = dto;

    // ✅ Type-safe: filters sudah QueryUserDto | undefined dari DTO
    const queryFilters: QueryUserDto = filters || {};
    const result = await this.usersService.findAll(queryFilters);
    const users = result.data;

    if (format === 'csv') {
      const csv = Papa.unparse(users);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=users-export-${Date.now()}.csv`,
      );
      res.send(csv);
      return;
    }

    // Excel export
    const worksheet = XLSX.utils.json_to_sheet(users);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

    // ✅ Type-safe: Cast result to Buffer explicitly
    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=users-export-${Date.now()}.xlsx`,
    );
    res.send(buffer);
  }
}
