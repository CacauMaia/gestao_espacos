import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import {
  Attendance,
  CheckoutReason,
} from '../../../entities/attendance.entity';
import { User } from '../../../entities/user.entity';

@Injectable()
export class CleanupExpiredAttendancesUseCase {
  private readonly autoCheckoutGracePeriodMs = 6 * 60 * 60 * 1000;

  constructor(
    @InjectRepository(Attendance)
    private readonly attendancesRepository: Repository<Attendance>,
  ) {}

  async execute(now = new Date()): Promise<void> {
    const limiteAutoSaida = new Date(
      now.getTime() - this.autoCheckoutGracePeriodMs,
    );

    await this.attendancesRepository.update(
      {
        exitAt: IsNull(),
        expectedExitAt: LessThanOrEqual(limiteAutoSaida),
      },
      {
        exitAt: now,
        checkoutReason: CheckoutReason.AutoExpired,
        checkoutNote: 'Saída automática por tempo excedido.',
      },
    );

    const inactiveUsersSubQuery = this.attendancesRepository
      .createQueryBuilder()
      .subQuery()
      .select('user.id')
      .from(User, 'user')
      .where('user.active = false')
      .getQuery();

    await this.attendancesRepository
      .createQueryBuilder()
      .update(Attendance)
      .set({
        exitAt: now,
        checkoutReason: CheckoutReason.AutoExpired,
        checkoutNote: 'Saída automática por usuário desativado.',
      })
      .where('exit_at IS NULL')
      .andWhere('expected_exit_at <= :now', { now })
      .andWhere(`user_id IN ${inactiveUsersSubQuery}`)
      .execute();
  }
}
