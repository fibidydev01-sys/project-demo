// ============================================================================
// FILE: server/src/modules/perkara/perkara.module.ts
// ✅ FIXED: Removed circular dependency
// ============================================================================
import { Module } from '@nestjs/common';
import { PerkaraService } from './perkara.service';
import { PerkaraController } from './perkara.controller';

@Module({
  controllers: [PerkaraController],
  providers: [PerkaraService],
  exports: [PerkaraService], // ✅ Export service agar bisa dipakai module lain
})
export class PerkaraModule {}
