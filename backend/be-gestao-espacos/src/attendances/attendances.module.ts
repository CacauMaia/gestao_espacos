import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Space } from '../entities/space.entity';
import { Attendance } from '../entities/attendance.entity';
import { AttendancesService } from './attendances.service';
import { AttendancesController } from './attendances.controller';
import { AttendanceCleanupService } from './attendance-cleanup.service';
import { CheckInUseCase } from './application/use-cases/check-in.use-case';
import { CheckOutUseCase } from './application/use-cases/check-out.use-case';
import { ForceCheckOutUseCase } from './application/use-cases/force-check-out.use-case';
import { CleanupExpiredAttendancesUseCase } from './application/use-cases/cleanup-expired-attendances.use-case';
import { ATTENDANCE_CHECK_IN_REPOSITORY } from './application/ports/attendance-check-in.repository.port';
import { CheckInPolicy } from './domain/check-in.policy';
import { TypeOrmAttendanceCheckInRepository } from './infrastructure/typeorm-attendance-check-in.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User, Space, Attendance])],
  providers: [
    AttendancesService,
    AttendanceCleanupService,
    CheckInUseCase,
    CheckOutUseCase,
    ForceCheckOutUseCase,
    CleanupExpiredAttendancesUseCase,
    CheckInPolicy,
    {
      provide: ATTENDANCE_CHECK_IN_REPOSITORY,
      useClass: TypeOrmAttendanceCheckInRepository,
    },
  ],
  controllers: [AttendancesController],
})
export class AttendancesModule {}
