import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AttendancesService } from './attendances.service';

@Injectable()
export class AttendanceCleanupService {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleExpiredAttendances(): Promise<void> {
    await this.attendancesService.cleanupExpiredAttendances();
  }
}
