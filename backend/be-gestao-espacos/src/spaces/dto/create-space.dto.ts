import { Type } from 'class-transformer';
import { IsEnum, IsPositive, IsString, MinLength } from 'class-validator';
import { SpaceType } from '../../entities/space.entity';

export class CreateSpaceDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(SpaceType)
  type: SpaceType;

  @Type(() => Number)
  @IsPositive()
  capacity: number;
}
