// ===== FILE: src/modules/users/users.service.ts (COMPLETE FIXED) =====
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as Papa from 'papaparse';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { StorageService } from '../storage/storage.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import {
  PaginatedResult,
  UserEntity,
  UserWithStats,
  CreateLogAktivitasData,
} from '../../common/interfaces';
import {
  TeamStatistics,
  WorkloadDistribution,
  BulkOperationResult,
} from '../../common/interfaces/statistics.interface';

type UserWithoutPassword = Omit<UserEntity, 'password'>;

const userSelectWithoutPassword = {
  id: true,
  email: true,
  nama_lengkap: true,
  role: true,
  jabatan: true,
  nomor_kta: true,
  nomor_berita_acara: true,
  spesialisasi: true,
  avatar_url: true,
  telepon: true,
  alamat: true,
  is_active: true,
  tanggal_bergabung: true,
  created_at: true,
  updated_at: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private email: EmailService,
    private config: ConfigService,
  ) {}

  async create(
    dto: CreateUserDto,
    creatorId: string,
  ): Promise<UserWithoutPassword> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email sudah terdaftar');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        nama_lengkap: dto.nama_lengkap,
        role: dto.role,
        jabatan: dto.jabatan || null,
        nomor_kta: dto.nomor_kta || null,
        nomor_berita_acara: dto.nomor_berita_acara || null,
        spesialisasi: dto.spesialisasi || null,
        telepon: dto.telepon || null,
        alamat: dto.alamat || null,
      },
      select: userSelectWithoutPassword,
    });

    const logData: CreateLogAktivitasData = {
      user_id: creatorId,
      aksi: 'CREATE_USER',
      jenis_entitas: 'user',
      id_entitas: user.id,
      detail: {
        email: user.email,
        nama: user.nama_lengkap,
      },
    };

    await this.prisma.logAktivitas.create({
      data: logData,
    });

    return user;
  }

  async findAll(
    query: QueryUserDto,
  ): Promise<PaginatedResult<UserWithoutPassword>> {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { nama_lengkap: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { jabatan: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: userSelectWithoutPassword,
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(id: string): Promise<UserWithStats> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nama_lengkap: true,
        role: true,
        jabatan: true,
        nomor_kta: true,
        nomor_berita_acara: true,
        spesialisasi: true,
        avatar_url: true,
        telepon: true,
        alamat: true,
        is_active: true,
        tanggal_bergabung: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            perkara_dibuat: true,
            tugas_ditugaskan: true,
            tim_perkara: true,
            klien_dibuat: true,
            dokumen_diunggah: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return user;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    updaterId: string,
  ): Promise<UserWithoutPassword> {
    await this.findOne(id);

    if (dto.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          NOT: { id },
        },
      });

      if (existingUser) {
        throw new BadRequestException('Email sudah digunakan user lain');
      }
    }

    const updateData: Prisma.UserUpdateInput = { ...dto };

    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: userSelectWithoutPassword,
    });

    const logData: CreateLogAktivitasData = {
      user_id: updaterId,
      aksi: 'UPDATE_USER',
      jenis_entitas: 'user',
      id_entitas: user.id,
      detail: { email: user.email },
    };

    await this.prisma.logAktivitas.create({
      data: logData,
    });

    return user;
  }

  async remove(id: string, deleterId: string): Promise<{ message: string }> {
    const user = await this.findOne(id);

    await this.prisma.user.delete({
      where: { id },
    });

    const logData: CreateLogAktivitasData = {
      user_id: deleterId,
      aksi: 'DELETE_USER',
      jenis_entitas: 'user',
      id_entitas: id,
      detail: { email: user.email },
    };

    await this.prisma.logAktivitas.create({
      data: logData,
    });

    return { message: 'User berhasil dihapus' };
  }

  async resetUserPassword(id: string): Promise<{ temporary_password: string }> {
    const user = await this.findOne(id);

    const temporaryPassword = crypto.randomBytes(5).toString('hex');
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    await this.prisma.logAktivitas.create({
      data: {
        user_id: id,
        aksi: 'RESET_PASSWORD',
        jenis_entitas: 'user',
        id_entitas: id,
        detail: {
          email: user.email,
          reset_by: 'admin',
        },
      },
    });

    console.log('✅ Password reset for user:', user.email);

    return { temporary_password: temporaryPassword };
  }

  async toggleUserStatus(
    id: string,
    active: boolean,
  ): Promise<UserWithoutPassword> {
    await this.findOne(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: { is_active: active },
      select: userSelectWithoutPassword,
    });

    await this.prisma.logAktivitas.create({
      data: {
        user_id: id,
        aksi: active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        jenis_entitas: 'user',
        id_entitas: id,
        detail: {
          email: user.email,
          status: active ? 'active' : 'inactive',
        },
      },
    });

    console.log(`✅ User ${active ? 'activated' : 'deactivated'}:`, user.email);

    return user;
  }

  async uploadAvatar(
    id: string,
    file: Express.Multer.File,
  ): Promise<{ avatar_url: string }> {
    const user = await this.findOne(id);

    if (user.avatar_url) {
      await this.storage.deleteFile(user.avatar_url);
    }

    const filepath = await this.storage.uploadFile(file, 'avatars', id);

    await this.prisma.user.update({
      where: { id },
      data: { avatar_url: filepath },
    });

    await this.prisma.logAktivitas.create({
      data: {
        user_id: id,
        aksi: 'UPLOAD_AVATAR',
        jenis_entitas: 'user',
        id_entitas: id,
        detail: {
          email: user.email,
          avatar_url: filepath,
        },
      },
    });

    console.log('✅ Avatar uploaded for user:', user.email);

    return { avatar_url: this.storage.getFileUrl(filepath) };
  }

  async deleteAvatar(id: string): Promise<void> {
    const user = await this.findOne(id);

    if (!user.avatar_url) {
      throw new BadRequestException('User tidak memiliki avatar');
    }

    await this.storage.deleteFile(user.avatar_url);

    await this.prisma.user.update({
      where: { id },
      data: { avatar_url: null },
    });

    await this.prisma.logAktivitas.create({
      data: {
        user_id: id,
        aksi: 'DELETE_AVATAR',
        jenis_entitas: 'user',
        id_entitas: id,
        detail: { email: user.email },
      },
    });

    console.log('✅ Avatar deleted for user:', user.email);
  }

  async getTeamStatistics(): Promise<TeamStatistics> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      total_users,
      adminCount,
      advokatCount,
      paralegalCount,
      staffCount,
      klienCount,
      active_users,
      inactive_users,
      recent_additions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'admin' } }),
      this.prisma.user.count({ where: { role: 'advokat' } }),
      this.prisma.user.count({ where: { role: 'paralegal' } }),
      this.prisma.user.count({ where: { role: 'staff' } }),
      this.prisma.user.count({ where: { role: 'klien' } }),
      this.prisma.user.count({ where: { is_active: true } }),
      this.prisma.user.count({ where: { is_active: false } }),
      this.prisma.user.count({
        where: { created_at: { gte: thirtyDaysAgo } },
      }),
    ]);

    return {
      total_users,
      by_role: {
        admin: adminCount,
        advokat: advokatCount,
        paralegal: paralegalCount,
        staff: staffCount,
        klien: klienCount,
      },
      active_users,
      inactive_users,
      recent_additions,
      last_30_days: recent_additions,
    };
  }

  async getWorkloadDistribution(): Promise<WorkloadDistribution[]> {
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: ['advokat', 'paralegal', 'staff'] },
        is_active: true,
      },
      select: {
        id: true,
        email: true,
        nama_lengkap: true,
        role: true,
        _count: {
          select: {
            perkara_dibuat: true,
            tugas_ditugaskan: true,
            dokumen_diunggah: true,
            tim_perkara: true,
          },
        },
      },
    });

    const distribution: WorkloadDistribution[] = await Promise.all(
      users.map(async (user) => {
        const pendingTugas = await this.prisma.tugas.count({
          where: {
            ditugaskan_ke: user.id,
            status: { in: ['belum_mulai', 'sedang_berjalan'] },
          },
        });

        const completedTugas = await this.prisma.tugas.count({
          where: {
            ditugaskan_ke: user.id,
            status: 'selesai',
          },
        });

        const activePerkara = await this.prisma.timPerkara.count({
          where: {
            user_id: user.id,
            perkara: {
              status: { in: ['aktif', 'pending'] },
            },
          },
        });

        const workload_score =
          activePerkara * 3 +
          pendingTugas * 2 +
          user._count.dokumen_diunggah * 0.5;

        return {
          user_id: user.id,
          user_name: user.nama_lengkap || user.email,
          email: user.email,
          role: user.role,
          active_perkara: activePerkara,
          pending_tugas: pendingTugas,
          completed_tugas: completedTugas,
          total_dokumen: user._count.dokumen_diunggah,
          workload_score: Math.round(workload_score * 10) / 10,
        };
      }),
    );

    return distribution.sort((a, b) => b.workload_score - a.workload_score);
  }

  async bulkDeleteUsers(
    userIds: string[],
    currentUserId: string,
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const userId of userIds) {
      try {
        if (userId === currentUserId) {
          result.failed++;
          result.errors.push({
            user_id: userId,
            email: 'self',
            reason: 'Cannot delete your own account',
          });
          continue;
        }

        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, role: true },
        });

        if (!user) {
          result.failed++;
          result.errors.push({
            user_id: userId,
            email: 'unknown',
            reason: 'User not found',
          });
          continue;
        }

        if (user.role === 'admin') {
          const adminCount = await this.prisma.user.count({
            where: { role: 'admin' },
          });
          if (adminCount <= 1) {
            result.failed++;
            result.errors.push({
              user_id: userId,
              email: user.email,
              reason: 'Cannot delete the last admin user',
            });
            continue;
          }
        }

        await this.prisma.user.delete({ where: { id: userId } });

        await this.prisma.logAktivitas.create({
          data: {
            user_id: currentUserId,
            aksi: 'BULK_DELETE_USER',
            jenis_entitas: 'user',
            id_entitas: userId,
            detail: { email: user.email },
          },
        });

        result.success++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        result.failed++;
        result.errors.push({
          user_id: userId,
          email: 'unknown',
          reason: errorMessage,
        });
      }
    }

    console.log(
      `✅ Bulk delete completed: ${result.success} success, ${result.failed} failed`,
    );
    return result;
  }

  async bulkChangeRole(
    userIds: string[],
    role: UserRole,
    currentUserId: string,
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const userId of userIds) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, role: true },
        });

        if (!user) {
          result.failed++;
          result.errors.push({
            user_id: userId,
            email: 'unknown',
            reason: 'User not found',
          });
          continue;
        }

        if (user.role === 'admin' && role !== 'admin') {
          const adminCount = await this.prisma.user.count({
            where: { role: 'admin' },
          });
          if (adminCount <= 1) {
            result.failed++;
            result.errors.push({
              user_id: userId,
              email: user.email,
              reason: 'Cannot change role of the last admin',
            });
            continue;
          }
        }

        await this.prisma.user.update({
          where: { id: userId },
          data: { role },
        });

        await this.prisma.logAktivitas.create({
          data: {
            user_id: currentUserId,
            aksi: 'BULK_CHANGE_ROLE',
            jenis_entitas: 'user',
            id_entitas: userId,
            detail: {
              email: user.email,
              old_role: user.role,
              new_role: role,
            },
          },
        });

        result.success++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        result.failed++;
        result.errors.push({
          user_id: userId,
          email: 'unknown',
          reason: errorMessage,
        });
      }
    }

    console.log(
      `✅ Bulk role change completed: ${result.success} success, ${result.failed} failed`,
    );
    return result;
  }

  async sendInvitationEmail(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.findOne(id);

    const temporaryPassword = crypto.randomBytes(6).toString('hex');
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    const loginUrl =
      this.config.get<string>('app.frontendUrl', 'http://localhost:3001') +
      '/login';

    const emailResult = await this.email.sendInvitationEmail({
      to: user.email,
      nama_lengkap: user.nama_lengkap,
      email: user.email,
      temporaryPassword,
      loginUrl,
    });

    await this.prisma.logAktivitas.create({
      data: {
        user_id: id,
        aksi: 'SEND_INVITATION',
        jenis_entitas: 'user',
        id_entitas: id,
        detail: {
          email: user.email,
          success: emailResult.success,
        },
      },
    });

    if (emailResult.success) {
      console.log('✅ Invitation email sent to:', user.email);
      return {
        success: true,
        message: 'Invitation email sent successfully',
      };
    } else {
      return {
        success: false,
        message: 'Failed to send invitation email',
      };
    }
  }

  async resendInvitationEmail(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.sendInvitationEmail(id);
  }

  async bulkImportUsers(
    file: Express.Multer.File,
    currentUserId: string,
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      const csvData = file.buffer.toString('utf-8');
      const parsed = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
      });

      const rows = parsed.data as Array<{
        email: string;
        nama_lengkap: string;
        role: UserRole;
        jabatan?: string;
        telepon?: string;
      }>;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          if (!row.email || !row.nama_lengkap || !row.role) {
            result.failed++;
            result.errors.push({
              row: i + 2,
              email: row.email || 'N/A',
              reason: 'Missing required fields',
            });
            continue;
          }

          const existing = await this.prisma.user.findUnique({
            where: { email: row.email },
          });

          if (existing) {
            result.failed++;
            result.errors.push({
              row: i + 2,
              email: row.email,
              reason: 'Email already exists',
            });
            continue;
          }

          const tempPassword = crypto.randomBytes(4).toString('hex');
          const hashedPassword = await bcrypt.hash(tempPassword, 10);

          await this.prisma.user.create({
            data: {
              email: row.email,
              password: hashedPassword,
              nama_lengkap: row.nama_lengkap,
              role: row.role,
              jabatan: row.jabatan || null,
              telepon: row.telepon || null,
            },
          });

          await this.prisma.logAktivitas.create({
            data: {
              user_id: currentUserId,
              aksi: 'BULK_IMPORT_USER',
              jenis_entitas: 'user',
              detail: { email: row.email },
            },
          });

          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            row: i + 2,
            email: row.email,
            reason: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return result;
    } catch (error) {
      throw new BadRequestException(
        `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
