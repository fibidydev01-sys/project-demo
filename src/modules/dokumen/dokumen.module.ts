// ===== FILE: src/modules/dokumen/dokumen.module.ts =====
import { Module } from '@nestjs/common';
import { DokumenService } from './dokumen.service';
import { DokumenController } from './dokumen.controller';

@Module({
  controllers: [DokumenController],
  providers: [DokumenService],
  exports: [DokumenService],
})
export class DokumenModule {}
