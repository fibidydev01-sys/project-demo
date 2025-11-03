// ===== FILE: src/modules/users/users.module.ts (NO CIRCULAR DEPENDENCY) =====
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { LogAktivitasModule } from '../log-aktivitas/log-aktivitas.module';

@Module({
  imports: [LogAktivitasModule], // ✅ Import untuk inject LogAktivitasService
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // ✅ Export untuk digunakan module lain
})
export class UsersModule {}
