import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsPositive, IsString, Max } from 'class-validator';
import { SpaceType } from '../../entities/space.entity';
import { UserRole } from '../../entities/user.entity';

export class ListActiveAttendancesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  spaceId?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: SpaceType })
  @IsOptional()
  @IsEnum(SpaceType)
  spaceType?: SpaceType;

  @ApiPropertyOptional({
    description: 'Busca por nome/email do usuário ou nome do espaço.',
  })
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
