// ===== FILE: src/modules/konflik/dto/update-konflik.dto.ts =====
import { PartialType } from '@nestjs/swagger';
import { CreateKonfikDto } from './create-konflik.dto';

export class UpdateKonfikDto extends PartialType(CreateKonfikDto) {}
