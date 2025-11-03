// ===== FILE: server/src/modules/tugas/tugas.service.ts (UPDATED) =====
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, UserRole } from '@prisma/client';
import { CreateTugasDto } from './dto/create-tugas.dto';
import { UpdateTugasDto } from './dto/update-tugas.dto';
import { QueryTugasDto } from './dto/query-tugas.dto';
import {
  PaginatedResult,
  TugasWithRelations,
  CreateLogAktivitasData,
} from '../../common/interfaces';

@Injectable()
export class TugasService {
  constructor(private prisma: PrismaService) {}

  async create(
    dto: CreateTugasDto,
    userId: string,
  ): Promise<TugasWithRelations> {
    const perkara = await this.prisma.perkara.findUnique({
      where: { id: dto.perkara_id },
    });

    if (!perkara) {
      throw new BadRequestException('Perkara tidak ditemukan');
    }

    if (dto.ditugaskan_ke) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.ditugaskan_ke },
      });

      if (!user) {
        throw new BadRequestException('User yang ditugaskan tidak ditemukan');
      }
    }

    const tugas = await this.prisma.tugas.create({
      data: {
        ...dto,
        dibuat_oleh: userId,
      },
      include: {
        perkara: {
          select: {
            id: true,
            nomor_perkara: true,
            judul: true,
            klien: {
              select: {
                id: true,
                nama: true,
                email: true,
                telepon: true,
                jenis_klien: true,
              },
            },
          },
        },
        petugas: {
          select: {
            id: true,
            email: true,
            nama_lengkap: true,
            role: true,
            avatar_url: true,
          },
        },
        pembuat: {
          select: {
            id: true,
            email: true,
            nama_lengkap: true,
            role: true,
            avatar_url: true,
          },
        },
      },
    });

    const logData: CreateLogAktivitasData = {
      user_id: userId,
      aksi: 'CREATE_TUGAS',
      jenis_entitas: 'tugas',
      id_entitas: tugas.id,
      detail: { judul: tugas.judul, perkara_id: tugas.perkara_id },
    };

    await this.prisma.logAktivitas.create({
      data: logData,
    });

    return tugas;
  }

  // ============================================================================
  // 🔥 UPDATED: Block client access completely
  // ============================================================================
  async findAll(
    query: QueryTugasDto,
    userId: string,
    userRole: UserRole,
  ): Promise<PaginatedResult<TugasWithRelations>> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      prioritas,
      perkara_id,
      ditugaskan_ke,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: Prisma.TugasWhereInput = {};

    // 🔥 RBAC: BLOCK CLIENT ACCESS COMPLETELY
    if (userRole === UserRole.klien) {
      throw new ForbiddenException(
        'Klien tidak dapat mengakses tugas internal firma hukum',
      );
    }

    // PARALEGAL: Hanya tugas yang ditugaskan ke mereka
    if (userRole === UserRole.paralegal) {
      where.ditugaskan_ke = userId;
    }

    // ADVOKAT: Tugas dari perkara yang mereka handle
    else if (userRole === UserRole.advokat) {
      where.perkara = {
        OR: [
          { dibuat_oleh: userId },
          { tim_perkara: { some: { user_id: userId } } },
        ],
      };
    }
    // ADMIN & STAFF: Full access (no additional filter)

    // Apply search & filters
    if (search) {
      const searchCondition: Prisma.TugasWhereInput = {
        OR: [
          { judul: { contains: search, mode: 'insensitive' } },
          { deskripsi: { contains: search, mode: 'insensitive' } },
        ],
      };

      if (where.AND) {
        if (Array.isArray(where.AND)) {
          where.AND.push(searchCondition);
        } else {
          where.AND = [where.AND, searchCondition];
        }
      } else if (where.perkara || where.perkara_id || where.ditugaskan_ke) {
        where.AND = [searchCondition];
      } else {
        Object.assign(where, searchCondition);
      }
    }

    if (status) where.status = status;
    if (prioritas) where.prioritas = prioritas;
    if (perkara_id) where.perkara_id = perkara_id;
    if (ditugaskan_ke) where.ditugaskan_ke = ditugaskan_ke;

    const orderBy: Prisma.TugasOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [data, total] = await Promise.all([
      this.prisma.tugas.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          perkara: {
            select: {
              id: true,
              nomor_perkara: true,
              judul: true,
              klien: {
                select: {
                  id: true,
                  nama: true,
                  email: true,
                  telepon: true,
                  jenis_klien: true,
                },
              },
            },
          },
          petugas: {
            select: {
              id: true,
              email: true,
              nama_lengkap: true,
              role: true,
              avatar_url: true,
            },
          },
          pembuat: {
            select: {
              id: true,
              email: true,
              nama_lengkap: true,
              role: true,
              avatar_url: true,
            },
          },
        },
      }),
      this.prisma.tugas.count({ where }),
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

  async findOne(id: string): Promise<TugasWithRelations> {
    const tugas = await this.prisma.tugas.findUnique({
      where: { id },
      include: {
        perkara: {
          select: {
            id: true,
            nomor_perkara: true,
            judul: true,
            klien: {
              select: {
                id: true,
                nama: true,
                email: true,
                telepon: true,
                jenis_klien: true,
              },
            },
          },
        },
        petugas: {
          select: {
            id: true,
            email: true,
            nama_lengkap: true,
            role: true,
            avatar_url: true,
          },
        },
        pembuat: {
          select: {
            id: true,
            email: true,
            nama_lengkap: true,
            role: true,
            avatar_url: true,
          },
        },
      },
    });

    if (!tugas) {
      throw new NotFoundException('Tugas tidak ditemukan');
    }

    return tugas;
  }

  async update(
    id: string,
    dto: UpdateTugasDto,
    userId: string,
  ): Promise<TugasWithRelations> {
    await this.findOne(id);

    const updateData: Prisma.TugasUpdateInput = { ...dto };

    if (dto.status === 'selesai') {
      const currentTugas = await this.prisma.tugas.findUnique({
        where: { id },
        select: { tanggal_selesai: true },
      });

      if (!currentTugas?.tanggal_selesai) {
        updateData.tanggal_selesai = new Date();
      }
    }

    const tugas = await this.prisma.tugas.update({
      where: { id },
      data: updateData,
      include: {
        perkara: {
          select: {
            id: true,
            nomor_perkara: true,
            judul: true,
            klien: {
              select: {
                id: true,
                nama: true,
                email: true,
                telepon: true,
                jenis_klien: true,
              },
            },
          },
        },
        petugas: {
          select: {
            id: true,
            email: true,
            nama_lengkap: true,
            role: true,
            avatar_url: true,
          },
        },
        pembuat: {
          select: {
            id: true,
            email: true,
            nama_lengkap: true,
            role: true,
            avatar_url: true,
          },
        },
      },
    });

    const logData: CreateLogAktivitasData = {
      user_id: userId,
      aksi: 'UPDATE_TUGAS',
      jenis_entitas: 'tugas',
      id_entitas: tugas.id,
      detail: { judul: tugas.judul, status: tugas.status },
    };

    await this.prisma.logAktivitas.create({
      data: logData,
    });

    return tugas;
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const tugas = await this.findOne(id);

    await this.prisma.tugas.delete({
      where: { id },
    });

    const logData: CreateLogAktivitasData = {
      user_id: userId,
      aksi: 'DELETE_TUGAS',
      jenis_entitas: 'tugas',
      id_entitas: id,
      detail: { judul: tugas.judul },
    };

    await this.prisma.logAktivitas.create({
      data: logData,
    });

    return { message: 'Tugas berhasil dihapus' };
  }

  async getMyTasks(
    userId: string,
    query: QueryTugasDto,
  ): Promise<PaginatedResult<TugasWithRelations>> {
    return this.findAll(
      { ...query, ditugaskan_ke: userId },
      userId,
      UserRole.paralegal,
    );
  }
}
