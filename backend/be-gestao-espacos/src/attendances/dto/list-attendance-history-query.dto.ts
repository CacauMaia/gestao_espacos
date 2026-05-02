import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsPositive, IsString, Max } from 'class-validator';
import { CheckoutReason } from '../../entities/attendance.entity';
import { UserRole } from '../../entities/user.entity';
import { PaginationQuery } from '../../common/pagination/pagination';
import { SpaceType } from '../../entities/space.entity';

export class ListAttendanceHistoryQueryDto implements PaginationQuery {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  spaceId?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(SpaceType)
  spaceType?: SpaceType;

  @IsOptional()
  @IsEnum(CheckoutReason)
  checkoutReason?: CheckoutReason;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: string;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Max(100)
  limit?: string;
}
