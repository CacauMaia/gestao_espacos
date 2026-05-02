import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  Attendance,
  CheckoutReason,
} from '../../../entities/attendance.entity';
import { CleanupExpiredAttendancesUseCase } from './cleanup-expired-attendances.use-case';

@Injectable()
export class CheckOutUseCase {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendancesRepository: Repository<Attendance>,
    private readonly cleanupExpiredAttendancesUseCase: CleanupExpiredAttendancesUseCase,
  ) {}

  async execute(userId: string): Promise<Attendance> {
    await this.cleanupExpiredAttendancesUseCase.execute();

    const activeAttendance = await this.attendancesRepository.findOne({
      where: {
        userId,
        exitAt: IsNull(),
      },
    });

    if (!activeAttendance) {
      throw new NotFoundException('Presença ativa não encontrada.');
    }

    activeAttendance.exitAt = new Date();
    activeAttendance.checkoutReason = CheckoutReason.Manual;
    activeAttendance.closedByUserId = userId;
    activeAttendance.checkoutNote = null;

    return this.attendancesRepository.save(activeAttendance);
  }
}
