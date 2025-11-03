// ============================================================================
// FILE: server/src/modules/log-aktivitas/log-aktivitas.controller.ts
// ============================================================================

import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { LogAktivitasService } from './log-aktivitas.service';
import { QueryLogDto } from './dto/query-log.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Activity Logs')
@ApiBearerAuth()
@Controller('log-aktivitas')
@UseGuards(RolesGuard)
export class LogAktivitasController {
  constructor(private readonly logService: LogAktivitasService) {}

  @Get()
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Get all activity logs with pagination & filters' })
  @ApiResponse({ status: 200, description: 'Activity logs retrieved' })
  findAll(@Query() query: QueryLogDto) {
    return this.logService.findAll(query);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get activity logs for specific user' })
  @ApiResponse({ status: 200, description: 'User activity logs retrieved' })
  findByUser(@Param('userId') userId: string) {
    return this.logService.findByUser(userId);
  }

  @Get('statistics')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Get activity statistics' })
  @ApiResponse({ status: 200, description: 'Activity statistics retrieved' })
  getStatistics(@Query('user_id') userId?: string) {
    return this.logService.getActivityStatistics(userId);
  }
}
