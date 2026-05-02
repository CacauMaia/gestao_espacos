import { IsOptional, IsString } from 'class-validator';

export class ForceCheckOutDto {
  @IsOptional()
  @IsString()
  note?: string;
}
