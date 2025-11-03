// ===== FILE: src/modules/tugas/tugas.module.ts =====
import { Module } from '@nestjs/common';
import { TugasService } from './tugas.service';
import { TugasController } from './tugas.controller';

@Module({
  controllers: [TugasController],
  providers: [TugasService],
  exports: [TugasService],
})
export class TugasModule {}
