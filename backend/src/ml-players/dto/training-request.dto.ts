import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class TrainingSnapshotDto {
  @IsString()
  playerId!: string;

  @IsString()
  season!: string;

  @IsDateString()
  date!: string;

  @IsObject()
  statistics!: Record<string, number>;

  @IsOptional()
  @IsString()
  granularity?: string;

  @IsOptional()
  @IsString()
  position?: string;
}

export class TrainingRequestDto {
  @IsIn(['whoscored', 'app', 'synthetic'])
  origenDatos!: 'whoscored' | 'app' | 'synthetic';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrainingSnapshotDto)
  snapshots?: TrainingSnapshotDto[];
}
