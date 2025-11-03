// ============================================================================
// FILE: src/common/interfaces/entities/dokumen.entity.ts (FIXED)
// ============================================================================

import { KategoriDokumen } from '@prisma/client';
import { KlienBasic } from './klien.entity';
import { UserBasic } from './user.entity';

/**
 * Dokumen Entity - Complete Dokumen data
 */
export interface DokumenEntity {
  id: string;
  perkara_id: string;
  nama_dokumen: string;
  kategori: KategoriDokumen;
  nomor_bukti: string | null;
  file_path: string;
  ukuran_file: number | null;
  tipe_file: string | null;
  versi: number;
  adalah_rahasia: boolean;
  diunggah_oleh: string | null;
  tanggal_dokumen: Date | null;
  tanggal_upload: Date;
  catatan: string | null;
}

/**
 * Dokumen with Relations
 */
export interface DokumenWithRelations extends DokumenEntity {
  perkara: {
    id: string;
    nomor_perkara: string;
    judul: string;
    klien: KlienBasic | null;
  };
  pengunggah: UserBasic | null;
}

/**
 * Create Dokumen Data
 */
export interface CreateDokumenData {
  perkara_id: string;
  nama_dokumen: string;
  kategori: KategoriDokumen;
  nomor_bukti?: string | null;
  file_path: string;
  ukuran_file?: number | null;
  tipe_file?: string | null;
  versi?: number;
  adalah_rahasia?: boolean;
  diunggah_oleh: string;
  tanggal_dokumen?: Date | null;
  catatan?: string | null;
}

/**
 * Update Dokumen Data - Now with explicit fields
 */
export interface UpdateDokumenData {
  nama_dokumen?: string;
  kategori?: KategoriDokumen;
  nomor_bukti?: string | null;
  ukuran_file?: number | null;
  tipe_file?: string | null;
  versi?: number;
  adalah_rahasia?: boolean;
  tanggal_dokumen?: Date | null;
  catatan?: string | null;
}
