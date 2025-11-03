// ===== FILE: src/modules/konflik/konflik.module.ts =====
import { Module } from '@nestjs/common';
import { KonfikService } from './konflik.service';
import { KonfikController } from './konflik.controller';

@Module({
  controllers: [KonfikController],
  providers: [KonfikService],
  exports: [KonfikService],
})
export class KonflikModule {}
