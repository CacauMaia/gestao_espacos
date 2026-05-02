import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsPositive, IsString, Max } from 'class-validator';
import { SpaceType } from '../../entities/space.entity';

export class ListSpacesQueryDto {
  @ApiPropertyOptional({ enum: SpaceType })
  @IsOptional()
  @IsEnum(SpaceType)
  type?: SpaceType;

  @ApiPropertyOptional({ description: 'Busca por nome.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Max(100)
  limit?: number;
}
