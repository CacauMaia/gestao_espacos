import { IsString, MinLength } from 'class-validator';

export class CreateAttendanceDto {
  @IsString()
  @MinLength(1)
  spaceId: string;
}
