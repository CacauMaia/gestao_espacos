import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';
import { SpaceType } from '../../entities/space.entity';

export class UpdateSpaceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEnum(SpaceType)
  type?: SpaceType;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  capacity?: number;
}
