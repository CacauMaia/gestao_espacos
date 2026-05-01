import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Space } from '../entities/space.entity';
import { Attendance } from '../entities/attendance.entity';
import { AttendancesService } from './attendances.service';
import { AttendancesController } from './attendances.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Space, Attendance])],
  providers: [AttendancesService],
  controllers: [AttendancesController],
})
export class AttendancesModule {}
