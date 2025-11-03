// ===== FILE: src/modules/sidang/sidang.module.ts =====
import { Module } from '@nestjs/common';
import { SidangService } from './sidang.service';
import { SidangController } from './sidang.controller';

@Module({
  controllers: [SidangController],
  providers: [SidangService],
  exports: [SidangService],
})
export class SidangModule {}
