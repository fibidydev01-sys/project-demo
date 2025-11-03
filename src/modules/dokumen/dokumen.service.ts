// ============================================================================
// FILE: server/src/modules/dokumen/dokumen.service.ts - WITH RBAC FILTERING
// ============================================================================
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, UserRole } from '@prisma/client';
import { CreateDokumenDto } from './dto/create-dokumen.dto';
import { UpdateDokumenDto } from './dto/update-dokumen.dto';
import { QueryDokumenDto } from './dto/query-dokumen.dto';
import {
  PaginatedResult,
  DokumenWithRelations,
  DokumenDownloadResponse,
  CreateLogAktivitasData,
} from '../../common/interfaces';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DokumenService {
  private uploadPath = './uploads/dokumen';

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  async create(
    dto: CreateDokumenDto,
    file: Express.Multer.File,
    userId: string,
  ): Promise<DokumenWithRelations> {
    if (!file) {
      throw new BadRequestException('File harus diupload');
    }

    const perkara = await this.prisma.perkara.findUnique({
      where: { id: dto.perkara_id },
    });

    if (!perkara) {
      throw new BadRequestException('Perkara tidak ditemukan');
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(this.uploadPath, fileName);
    fs.writeFileSync(filePath, file.buffer);

    const dokumen = await this.prisma.dokumenHukum.create({
      data: {
        perkara_id: dto.perkara_id,
        nama_dokumen: dto.nama_dokumen || file.originalname,
        kategori: dto.kategori,
        nomor_bukti: dto.nomor_bukti,
        file_path: filePath,
        ukuran_file: file.size,
        tipe_file: file.mimetype,
        adalah_rahasia: dto.adalah_rahasia || false,
        tanggal_dokumen: dto.tanggal_dokumen,
        catatan: dto.catatan,
        diunggah_oleh: userId,
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
        pengunggah: {
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
      aksi: 'UPLOAD_DOKUMEN',
      jenis_entitas: 'dokumen',
      id_entitas: dokumen.id,
      detail: {
        nama_dokumen: dokumen.nama_dokumen,
        perkara_id: dto.perkara_id,
      },
    };

    await this.prisma.logAktivitas.create({
      data: logData,
    });

    return dokumen;
  }

  // ============================================================================
  // ✅ RBAC FILTERING APPLIED HERE!
  // ============================================================================
  async findAll(
    query: QueryDokumenDto,
    userId: string,
    userRole: UserRole,
  ): Promise<PaginatedResult<DokumenWithRelations>> {
    const {
      page = 1,
      limit = 10,
      search,
      kategori,
      perkara_id,
      sortBy = 'tanggal_upload',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: Prisma.DokumenHukumWhereInput = {};

    // 🔥 RBAC: DATA FILTERING BASED ON USER ROLE
    if (userRole === UserRole.klien) {
      // KLIEN: Hanya dokumen dari perkara mereka
      const perkaraIds = await this.prisma.perkara.findMany({
        where: { klien_id: userId },
        select: { id: true },
      });

      where.perkara_id = {
        in: perkaraIds.map((p) => p.id),
      };
    } else if (userRole === UserRole.advokat) {
      // ADVOKAT: Dokumen dari perkara yang mereka handle (dibuat) atau di tim
      where.perkara = {
        OR: [
          { dibuat_oleh: userId },
          { tim_perkara: { some: { user_id: userId } } },
        ],
      };
    }
    // ADMIN, STAFF, PARALEGAL: Full access (no additional filter)

    // Apply search & filters
    if (search) {
      const searchCondition: Prisma.DokumenHukumWhereInput = {
        OR: [
          { nama_dokumen: { contains: search, mode: 'insensitive' } },
          { nomor_bukti: { contains: search, mode: 'insensitive' } },
        ],
      };

      // Safe way to add to AND condition
      if (where.AND) {
        if (Array.isArray(where.AND)) {
          where.AND.push(searchCondition);
        } else {
          where.AND = [where.AND, searchCondition];
        }
      } else if (where.perkara || where.perkara_id) {
        where.AND = [searchCondition];
      } else {
        Object.assign(where, searchCondition);
      }
    }

    if (kategori) where.kategori = kategori;
    if (perkara_id) where.perkara_id = perkara_id;

    const orderBy: Prisma.DokumenHukumOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [data, total] = await Promise.all([
      this.prisma.dokumenHukum.findMany({
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
          pengunggah: {
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
      this.prisma.dokumenHukum.count({ where }),
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

  async findOne(id: string): Promise<DokumenWithRelations> {
    const dokumen = await this.prisma.dokumenHukum.findUnique({
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
        pengunggah: {
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

    if (!dokumen) {
      throw new NotFoundException('Dokumen tidak ditemukan');
    }

    return dokumen;
  }

  async download(id: string): Promise<DokumenDownloadResponse> {
    const dokumen = await this.findOne(id);

    if (!fs.existsSync(dokumen.file_path)) {
      throw new NotFoundException('File tidak ditemukan di server');
    }

    return {
      file_path: dokumen.file_path,
      nama_dokumen: dokumen.nama_dokumen,
    };
  }

  async update(
    id: string,
    dto: UpdateDokumenDto,
    userId: string,
  ): Promise<DokumenWithRelations> {
    await this.findOne(id);

    const updateData: Prisma.DokumenHukumUpdateInput = { ...dto };

    const dokumen = await this.prisma.dokumenHukum.update({
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
        pengunggah: {
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
      aksi: 'UPDATE_DOKUMEN',
      jenis_entitas: 'dokumen',
      id_entitas: dokumen.id,
      detail: { nama_dokumen: dokumen.nama_dokumen },
    };

    await this.prisma.logAktivitas.create({
      data: logData,
    });

    return dokumen;
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const dokumen = await this.findOne(id);

    if (fs.existsSync(dokumen.file_path)) {
      fs.unlinkSync(dokumen.file_path);
    }

    await this.prisma.dokumenHukum.delete({
      where: { id },
    });

    const logData: CreateLogAktivitasData = {
      user_id: userId,
      aksi: 'DELETE_DOKUMEN',
      jenis_entitas: 'dokumen',
      id_entitas: id,
      detail: { nama_dokumen: dokumen.nama_dokumen },
    };

    await this.prisma.logAktivitas.create({
      data: logData,
    });

    return { message: 'Dokumen berhasil dihapus' };
  }
}
