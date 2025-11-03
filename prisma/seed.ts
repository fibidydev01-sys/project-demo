// ============================================================
// PRISMA SEED - SAMPLE DATA GENERATOR (IDEMPOTENT VERSION)
// ============================================================

import {
  PrismaClient,
  UserRole,
  JenisPerkara,
  StatusPerkara,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ============================================================
  // STEP 1: CLEANUP EXISTING SEED DATA (SAFE MODE)
  // ============================================================
  console.log('🧹 Cleaning up existing seed data...');

  try {
    const userIds = await getUserIds();

    if (userIds.length > 0) {
      await prisma.jadwalSidang.deleteMany({
        where: { dibuat_oleh: { in: userIds } },
      });

      await prisma.tugas.deleteMany({
        where: { dibuat_oleh: { in: userIds } },
      });
    }

    await prisma.timPerkara.deleteMany({});

    await prisma.perkara.deleteMany({
      where: { nomor_perkara: { startsWith: 'PKR/2024/' } },
    });

    await prisma.klien.deleteMany({
      where: {
        OR: [
          { email: 'contact@teknologi.co.id' },
          { email: 'ahmad.wijaya@email.com' },
        ],
      },
    });

    console.log('✓ Cleanup completed\n');
  } catch {
    console.log('⚠️  Skipping cleanup (fresh database)\n');
  }

  // ============================================================
  // STEP 2: CREATE USERS
  // ============================================================
  const hashedPassword = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@perari.id' },
    update: {
      password: hashedPassword,
      nama_lengkap: 'Administrator PERARI',
      role: UserRole.admin,
      jabatan: 'System Administrator',
      telepon: '081234567890',
    },
    create: {
      email: 'admin@perari.id',
      password: hashedPassword,
      nama_lengkap: 'Administrator PERARI',
      role: UserRole.admin,
      jabatan: 'System Administrator',
      telepon: '081234567890',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  const advokat1 = await prisma.user.upsert({
    where: { email: 'advokat@perari.id' },
    update: {
      password: hashedPassword,
      nama_lengkap: 'Dr. Budi Santoso, S.H., M.H.',
      role: UserRole.advokat,
      jabatan: 'Advokat Senior',
      nomor_kta: 'ADV-2020-001',
      nomor_berita_acara: 'BA-001/2020/PN-JKT',
      spesialisasi: 'Hukum Perdata, Hukum Pidana',
      telepon: '081234567891',
    },
    create: {
      email: 'advokat@perari.id',
      password: hashedPassword,
      nama_lengkap: 'Dr. Budi Santoso, S.H., M.H.',
      role: UserRole.advokat,
      jabatan: 'Advokat Senior',
      nomor_kta: 'ADV-2020-001',
      nomor_berita_acara: 'BA-001/2020/PN-JKT',
      spesialisasi: 'Hukum Perdata, Hukum Pidana',
      telepon: '081234567891',
    },
  });
  console.log('✅ Advokat created:', advokat1.email);

  const paralegal = await prisma.user.upsert({
    where: { email: 'paralegal@perari.id' },
    update: {
      password: hashedPassword,
      nama_lengkap: 'Siti Rahayu, S.H.',
      role: UserRole.paralegal,
      jabatan: 'Paralegal',
      telepon: '081234567892',
    },
    create: {
      email: 'paralegal@perari.id',
      password: hashedPassword,
      nama_lengkap: 'Siti Rahayu, S.H.',
      role: UserRole.paralegal,
      jabatan: 'Paralegal',
      telepon: '081234567892',
    },
  });
  console.log('✅ Paralegal created:', paralegal.email);

  const staff = await prisma.user.upsert({
    where: { email: 'staff@perari.id' },
    update: {
      password: hashedPassword,
      nama_lengkap: 'Andi Wijaya',
      role: UserRole.staff,
      jabatan: 'Staff Administrasi',
      telepon: '081234567893',
    },
    create: {
      email: 'staff@perari.id',
      password: hashedPassword,
      nama_lengkap: 'Andi Wijaya',
      role: UserRole.staff,
      jabatan: 'Staff Administrasi',
      telepon: '081234567893',
    },
  });
  console.log('✅ Staff created:', staff.email);

  const klienUser = await prisma.user.upsert({
    where: { email: 'klien@perari.id' },
    update: {
      password: hashedPassword,
      nama_lengkap: 'Klien Portal User',
      role: UserRole.klien,
      jabatan: 'Klien',
      telepon: '081234567894',
    },
    create: {
      email: 'klien@perari.id',
      password: hashedPassword,
      nama_lengkap: 'Klien Portal User',
      role: UserRole.klien,
      jabatan: 'Klien',
      telepon: '081234567894',
    },
  });
  console.log('✅ Klien user created:', klienUser.email);

  // ============================================================
  // STEP 3: CREATE CLIENTS
  // ============================================================
  const klien1 = await prisma.klien.create({
    data: {
      nama: 'PT. Teknologi Nusantara',
      jenis_klien: 'perusahaan',
      nomor_identitas: '3174010101900001',
      npwp: '01.234.567.8-901.000',
      email: 'contact@teknologi.co.id',
      telepon: '0212345678',
      alamat: 'Jl. Sudirman No. 123',
      kelurahan: 'Menteng',
      kecamatan: 'Menteng',
      kota: 'Jakarta Pusat',
      provinsi: 'DKI Jakarta',
      kode_pos: '10310',
      nama_perusahaan: 'PT. Teknologi Nusantara',
      bentuk_badan_usaha: 'PT',
      nomor_akta: 'AHU-0012345.AH.01.01.Tahun 2020',
      dibuat_oleh: admin.id,
    },
  });
  console.log('✅ Sample client created:', klien1.nama);

  const klien2 = await prisma.klien.create({
    data: {
      nama: 'Ahmad Wijaya',
      jenis_klien: 'perorangan',
      nomor_identitas: '3174020202850001',
      email: 'ahmad.wijaya@email.com',
      telepon: '081298765432',
      alamat: 'Jl. Gatot Subroto No. 45',
      kota: 'Jakarta Selatan',
      provinsi: 'DKI Jakarta',
      dibuat_oleh: advokat1.id,
    },
  });
  console.log('✅ Sample client 2 created:', klien2.nama);

  // ============================================================
  // STEP 4: CREATE CASES
  // ============================================================
  const perkara1 = await prisma.perkara.create({
    data: {
      nomor_perkara: 'PKR/2024/001',
      nomor_perkara_pengadilan: '123/Pdt.G/2024/PN.Jkt.Sel',
      judul: 'Gugatan Wanprestasi PT. Teknologi vs PT. ABC',
      deskripsi: 'Gugatan wanprestasi terkait perjanjian kerja sama bisnis',
      klien_id: klien1.id,
      jenis_perkara: JenisPerkara.perdata,
      status: StatusPerkara.aktif,
      prioritas: 'tinggi',
      tingkat_pengadilan: 'PN',
      nama_pengadilan: 'Pengadilan Negeri Jakarta Selatan',
      posisi_klien: 'Penggugat',
      pihak_lawan: 'PT. ABC Corporation',
      kuasa_hukum_lawan: 'Law Firm XYZ & Partners',
      nilai_perkara: 5000000000,
      tanggal_register: new Date('2024-01-15'),
      tanggal_sidang_pertama: new Date('2024-02-01'),
      nilai_fee: 150000000,
      status_pembayaran: 'Sebagian',
      dibuat_oleh: advokat1.id,
    },
  });
  console.log('✅ Sample case created:', perkara1.nomor_perkara);

  const perkara2 = await prisma.perkara.create({
    data: {
      nomor_perkara: 'PKR/2024/002',
      nomor_perkara_pengadilan: '456/Pid.B/2024/PN.Jkt.Pst',
      judul: 'Perkara Pidana Penggelapan',
      deskripsi: 'Kasus penggelapan dana perusahaan',
      klien_id: klien2.id,
      jenis_perkara: JenisPerkara.pidana,
      status: StatusPerkara.aktif,
      prioritas: 'mendesak',
      tingkat_pengadilan: 'PN',
      nama_pengadilan: 'Pengadilan Negeri Jakarta Pusat',
      posisi_klien: 'Terdakwa',
      pihak_lawan: 'Jaksa Penuntut Umum',
      nilai_perkara: 2500000000,
      tanggal_register: new Date('2024-02-10'),
      tanggal_sidang_pertama: new Date('2024-03-01'),
      nilai_fee: 100000000,
      status_pembayaran: 'Lunas',
      dibuat_oleh: advokat1.id,
    },
  });
  console.log('✅ Sample case 2 created:', perkara2.nomor_perkara);

  // ============================================================
  // STEP 5: CREATE CASE TEAM
  // ============================================================
  await prisma.timPerkara.createMany({
    data: [
      {
        perkara_id: perkara1.id,
        user_id: advokat1.id,
        peran: 'Lead Counsel',
      },
      {
        perkara_id: perkara1.id,
        user_id: paralegal.id,
        peran: 'Legal Assistant',
      },
      {
        perkara_id: perkara2.id,
        user_id: advokat1.id,
        peran: 'Lead Counsel',
      },
      {
        perkara_id: perkara2.id,
        user_id: staff.id,
        peran: 'Administrative Support',
      },
    ],
  });
  console.log('✅ Case teams created');

  // ============================================================
  // STEP 6: CREATE TASKS
  // ============================================================
  await prisma.tugas.createMany({
    data: [
      {
        perkara_id: perkara1.id,
        judul: 'Draft Surat Gugatan',
        deskripsi: 'Membuat draft surat gugatan lengkap dengan bukti-bukti',
        ditugaskan_ke: advokat1.id,
        status: 'sedang_berjalan',
        prioritas: 'tinggi',
        tenggat_waktu: new Date('2024-01-25'),
        dapat_ditagih: true,
        jam_kerja: 8.5,
        tarif_per_jam: 500000,
        dibuat_oleh: advokat1.id,
      },
      {
        perkara_id: perkara1.id,
        judul: 'Riset Hukum Wanprestasi',
        deskripsi: 'Melakukan riset putusan-putusan serupa',
        ditugaskan_ke: paralegal.id,
        status: 'selesai',
        prioritas: 'sedang',
        tenggat_waktu: new Date('2024-01-20'),
        tanggal_selesai: new Date('2024-01-19'),
        dapat_ditagih: true,
        jam_kerja: 4,
        tarif_per_jam: 300000,
        dibuat_oleh: advokat1.id,
      },
      {
        perkara_id: perkara2.id,
        judul: 'Persiapan Pembelaan',
        deskripsi: 'Menyusun strategi pembelaan dan mengumpulkan bukti',
        ditugaskan_ke: advokat1.id,
        status: 'sedang_berjalan',
        prioritas: 'mendesak',
        tenggat_waktu: new Date('2024-02-28'),
        dapat_ditagih: true,
        jam_kerja: 12,
        tarif_per_jam: 600000,
        dibuat_oleh: admin.id,
      },
      {
        perkara_id: perkara2.id,
        judul: 'Administrasi Berkas Perkara',
        deskripsi: 'Mengorganisir dan mengelola berkas perkara',
        ditugaskan_ke: staff.id,
        status: 'belum_mulai',
        prioritas: 'sedang',
        tenggat_waktu: new Date('2024-02-25'),
        dapat_ditagih: false,
        dibuat_oleh: admin.id,
      },
    ],
  });
  console.log('✅ Sample tasks created');

  // ============================================================
  // STEP 7: CREATE HEARING SCHEDULES
  // ============================================================
  await prisma.jadwalSidang.createMany({
    data: [
      {
        perkara_id: perkara1.id,
        jenis_sidang: 'sidang_pertama',
        tanggal_sidang: new Date('2024-02-01'),
        waktu_mulai: '09:00',
        waktu_selesai: '12:00',
        nama_pengadilan: 'Pengadilan Negeri Jakarta Selatan',
        nomor_ruang_sidang: 'Ruang 101',
        nama_hakim: 'Dr. Ahmad Yani, S.H., M.H.',
        agenda_sidang: 'Pembacaan gugatan dan jawaban',
        dibuat_oleh: advokat1.id,
      },
      {
        perkara_id: perkara1.id,
        jenis_sidang: 'sidang_pembuktian',
        tanggal_sidang: new Date('2024-03-15'),
        waktu_mulai: '10:00',
        waktu_selesai: '13:00',
        nama_pengadilan: 'Pengadilan Negeri Jakarta Selatan',
        nomor_ruang_sidang: 'Ruang 101',
        nama_hakim: 'Dr. Ahmad Yani, S.H., M.H.',
        agenda_sidang: 'Pembuktian saksi dan dokumen',
        dibuat_oleh: advokat1.id,
      },
      {
        perkara_id: perkara2.id,
        jenis_sidang: 'sidang_pertama',
        tanggal_sidang: new Date('2024-03-01'),
        waktu_mulai: '09:30',
        waktu_selesai: '11:30',
        nama_pengadilan: 'Pengadilan Negeri Jakarta Pusat',
        nomor_ruang_sidang: 'Ruang 203',
        nama_hakim: 'Dra. Siti Nurhaliza, S.H., M.H.',
        agenda_sidang: 'Pembacaan dakwaan',
        dibuat_oleh: advokat1.id,
      },
    ],
  });
  console.log('✅ Sample hearing schedules created');

  // ============================================================
  // STEP 8: CREATE CLIENT PORTAL ACCESS
  // ============================================================
  await prisma.aksesPortalKlien.create({
    data: {
      klien_id: klien1.id,
      user_id: klienUser.id,
      is_aktif: true,
    },
  });
  console.log('✅ Client portal access created');

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 DATABASE SEEDED SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log('\n📧 Login Credentials:');
  console.log('   ┌─────────────────────────────────────────────┐');
  console.log('   │ Admin:     admin@perari.id / Admin123!      │');
  console.log('   │ Advokat:   advokat@perari.id / Admin123!    │');
  console.log('   │ Paralegal: paralegal@perari.id / Admin123!  │');
  console.log('   │ Staff:     staff@perari.id / Admin123!      │');
  console.log('   │ Klien:     klien@perari.id / Admin123!      │');
  console.log('   └─────────────────────────────────────────────┘');
  console.log('\n📊 Data Created:');
  console.log('   • 5 Users (Admin, Advokat, Paralegal, Staff, Klien)');
  console.log('   • 2 Clients (1 Company, 1 Individual)');
  console.log('   • 2 Cases (1 Civil, 1 Criminal)');
  console.log('   • 4 Case Team Members');
  console.log('   • 4 Tasks (2 Active, 1 Completed, 1 Pending)');
  console.log('   • 3 Hearing Schedules');
  console.log('   • 1 Client Portal Access');
  console.log('\n✨ You can now run the application!\n');
}

// Helper function to get user IDs
async function getUserIds(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: [
          'admin@perari.id',
          'advokat@perari.id',
          'paralegal@perari.id',
          'staff@perari.id',
          'klien@perari.id',
        ],
      },
    },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

main()
  .catch((e) => {
    console.error('\n❌ ERROR SEEDING DATABASE:');
    console.error('─'.repeat(60));
    console.error(e);
    console.error('─'.repeat(60));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
