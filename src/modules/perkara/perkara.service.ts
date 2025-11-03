// ============================================================================
// FILE: server/src/modules/perkara/perkara.service.ts
// ✅ FIXED: Cache invalidation handled internally
// ============================================================================
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import { Prisma, UserRole } from '@prisma/client';
import { CreatePerkaraDto } from './dto/create-perkara.dto';
import { UpdatePerkaraDto } from './dto/update-perkara.dto';
import { QueryPerkaraDto } from './dto/query-perkara.dto';
import {
  PaginatedResult,
  PerkaraWithKlien,
  PerkaraWithRelations,
  PerkaraStatistics,
  CreateLogAktivitasData,
} from '../../common/interfaces';

@Injectable()
export class PerkaraService {
  constructor(
    private prisma: PrismaService,
    private cache: RedisCacheService,
  ) {}

  private getCacheKey(
    method: string,
    params?: Record<string, unknown>,
  ): string {
    if (!params) return `perkara:${method}`;
    return `perkara:${method}:${JSON.stringify(params)}`;
  }

  // ✅ PUBLIC METHOD: Bisa dipanggil dari module lain tanpa circular dependency
  async invalidatePerkaraCache(perkaraId: string): Promise<void> {
    try {
      console.log('🗑️ Invalidating perkara cache for:', perkaraId);

      const cacheKeys = [
        this.getCacheKey('findOne', { id: perkaraId }),
        this.getCacheKey('statistics', { perkaraId }),
      ];

      await Promise.all(cacheKeys.map((key) => this.cache.del(key)));
      await this.cache.delPattern('perkara:findAll:*');

      console.log('✅ Perkara cache invalidated successfully');
    } catch (error) {
      console.error('⚠️ Failed to invalidate perkara cache:', error);
    }
  }

  async findAll(
    query: QueryPerkaraDto,
    userId: string,
    userRole: UserRole,
  ): Promise<PaginatedResult<PerkaraWithKlien>> {
    const {
      page = 1,
      limit = 10,
      search,
      jenis_perkara,
      status,
      klien_id,
      nama_pengadilan,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: Prisma.PerkaraWhereInput = {};

    // RBAC: DATA FILTERING BASED ON USER ROLE
    if (userRole === UserRole.klien) {
      where.klien_id = userId;
    } else if (userRole === UserRole.advokat) {
      where.OR = [
        { dibuat_oleh: userId },
        { tim_perkara: { some: { user_id: userId } } },
      ];
    }

    if (search) {
      const searchCondition: Prisma.PerkaraWhereInput = {
        OR: [
          { nomor_perkara: { contains: search, mode: 'insensitive' } },
          { judul: { contains: search, mode: 'insensitive' } },
          { pihak_lawan: { contains: search, mode: 'insensitive' } },
        ],
      };

      if (where.AND) {
        if (Array.isArray(where.AND)) {
          where.AND.push(searchCondition);
        } else {
          where.AND = [where.AND, searchCondition];
        }
      } else if (where.OR || where.klien_id) {
        where.AND = [searchCondition];
      } else {
        Object.assign(where, searchCondition);
      }
    }

    if (jenis_perkara) where.jenis_perkara = jenis_perkara;
    if (status) where.status = status;
    if (klien_id) where.klien_id = klien_id;
    if (nama_pengadilan) {
      where.nama_pengadilan = {
        contains: nama_pengadilan,
        mode: 'insensitive',
      };
    }

    const orderBy: Prisma.PerkaraOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [data, total] = await Promise.all([
      this.prisma.perkara.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          klien: {
            select: {
              id: true,
              nama: true,
              email: true,
              telepon: true,
              jenis_klien: true,
            },
          },
          _count: {
            select: {
              tugas: true,
              dokumen: true,
              jadwal_sidang: true,
            },
          },
        },
      }),
      this.prisma.perkara.count({ where }),
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

  async findOne(id: string): Promise<PerkaraWithRelations> {
    const cacheKey = this.getCacheKey('findOne', { id });

    const cached = await this.cache.get<PerkaraWithRelations>(cacheKey);
    if (cached) return cached;

    const perkara = await this.prisma.perkara.findUnique({
      where: { id },
      include: {
        klien: true,
        pembuat: {
          select: {
            id: true,
            nama_lengkap: true,
            email: true,
            jabatan: true,
            avatar_url: true,
            telepon: true,
          },
        },
        tim_perkara: {
          include: {
            user: {
              select: {
                id: true,
                nama_lengkap: true,
                email: true,
                jabatan: true,
                avatar_url: true,
                telepon: true,
              },
            },
          },
        },
        tugas: {
          orderBy: { created_at: 'desc' },
          take: 10,
          include: {
            petugas: {
              select: {
                id: true,
                email: true,
                nama_lengkap: true,
                role: true,
                avatar_url: true,
              },
            },
          },
        },
        dokumen: {
          orderBy: { tanggal_upload: 'desc' },
          take: 10,
        },
        jadwal_sidang: {
          orderBy: { tanggal_sidang: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            tugas: true,
            dokumen: true,
            jadwal_sidang: true,
            catatan_perkara: true,
          },
        },
      },
    });

    if (!perkara) {
      throw new NotFoundException('Perkara tidak ditemukan');
    }

    await this.cache.set(cacheKey, perkara, 1800);
    return perkara;
  }

  async create(
    dto: CreatePerkaraDto,
    userId: string,
  ): Promise<PerkaraWithKlien> {
    const perkara = await this.prisma.perkara.create({
      data: {
        ...dto,
        dibuat_oleh: userId,
      },
      include: {
        klien: {
          select: {
            id: true,
            nama: true,
            email: true,
            telepon: true,
            jenis_klien: true,
          },
        },
        _count: {
          select: {
            tugas: true,
            dokumen: true,
            jadwal_sidang: true,
          },
        },
      },
    });

    const logData: CreateLogAktivitasData = {
      user_id: userId,
      aksi: 'CREATE_PERKARA',
      jenis_entitas: 'perkara',
      id_entitas: perkara.id,
      detail: {
        nomor_perkara: perkara.nomor_perkara,
        judul: perkara.judul,
      },
    };

    await this.prisma.logAktivitas.create({
      data: logData,
    });

    await this.cache.delPattern('perkara:findAll:*');
    return perkara;
  }

  async update(
    id: string,
    dto: UpdatePerkaraDto,
    userId: string,
  ): Promise<PerkaraWithKlien> {
    await this.findOne(id);

    const updateData: Prisma.PerkaraUpdateInput = { ...dto };

    const perkara = await this.prisma.perkara.update({
      where: { id },
      data: updateData,
      include: {
        klien: {
          select: {
            id: true,
            nama: true,
            email: true,
            telepon: true,
            jenis_klien: true,
          },
        },
        _count: {
          select: {
            tugas: true,
            dokumen: true,
            jadwal_sidang: true,
          },
        },
      },
    });

    const logData: CreateLogAktivitasData = {
      user_id: userId,
      aksi: 'UPDATE_PERKARA',
      jenis_entitas: 'perkara',
      id_entitas: perkara.id,
      detail: { nomor_perkara: perkara.nomor_perkara },
    };

    await this.prisma.logAktivitas.create({
      data: logData,
    });

    await this.invalidatePerkaraCache(id);
    return perkara;
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const perkara = await this.findOne(id);

    await this.prisma.perkara.delete({
      where: { id },
    });

    const logData: CreateLogAktivitasData = {
      user_id: userId,
      aksi: 'DELETE_PERKARA',
      jenis_entitas: 'perkara',
      id_entitas: id,
      detail: { nomor_perkara: perkara.nomor_perkara },
    };

    await this.prisma.logAktivitas.create({
      data: logData,
    });

    await this.invalidatePerkaraCache(id);
    return { message: 'Perkara berhasil dihapus' };
  }

  async getStatistics(perkaraId: string): Promise<PerkaraStatistics> {
    const cacheKey = this.getCacheKey('statistics', { perkaraId });

    const cached = await this.cache.get<PerkaraStatistics>(cacheKey);
    if (cached) return cached;

    const perkara = await this.findOne(perkaraId);

    const [totalTugas, tugasSelesai, totalDokumen, totalSidang] =
      await Promise.all([
        this.prisma.tugas.count({ where: { perkara_id: perkaraId } }),
        this.prisma.tugas.count({
          where: { perkara_id: perkaraId, status: 'selesai' },
        }),
        this.prisma.dokumenHukum.count({ where: { perkara_id: perkaraId } }),
        this.prisma.jadwalSidang.count({ where: { perkara_id: perkaraId } }),
      ]);

    const result: PerkaraStatistics = {
      perkara_info: {
        nomor_perkara: perkara.nomor_perkara,
        judul: perkara.judul,
        status: perkara.status,
      },
      statistik: {
        total_tugas: totalTugas,
        tugas_selesai: tugasSelesai,
        tugas_progress:
          totalTugas > 0
            ? ((tugasSelesai / totalTugas) * 100).toFixed(2) + '%'
            : '0%',
        total_dokumen: totalDokumen,
        total_sidang: totalSidang,
      },
    };

    await this.cache.set(cacheKey, result, 600);
    return result;
  }
}
