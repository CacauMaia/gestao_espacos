import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TokenPayload } from '../../../auth/services/token.service';
import {
  Attendance,
  CheckoutReason,
} from '../../../entities/attendance.entity';
import { UserRole } from '../../../entities/user.entity';
import { CleanupExpiredAttendancesUseCase } from './cleanup-expired-attendances.use-case';

@Injectable()
export class ForceCheckOutUseCase {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendancesRepository: Repository<Attendance>,
    private readonly cleanupExpiredAttendancesUseCase: CleanupExpiredAttendancesUseCase,
  ) {}

  async execute(
    attendanceId: string,
    actor: TokenPayload,
    note?: string,
  ): Promise<Attendance> {
    await this.cleanupExpiredAttendancesUseCase.execute();

    if (![UserRole.Admin, UserRole.Monitor].includes(actor.role)) {
      throw new ForbiddenException(
        'Você não tem permissão para encerrar presença.',
      );
    }

    const activeAttendance = await this.attendancesRepository.findOne({
      where: {
        id: attendanceId,
        exitAt: IsNull(),
      },
      relations: {
        user: true,
        space: true,
      },
    });

    if (!activeAttendance) {
      throw new NotFoundException('Presença ativa não encontrada.');
    }

    await this.garantirMonitorNoMesmoAmbiente(actor, activeAttendance);

    activeAttendance.exitAt = new Date();
    activeAttendance.checkoutReason = CheckoutReason.Forced;
    activeAttendance.closedByUserId = actor.sub;
    activeAttendance.checkoutNote = note?.trim() || null;

    return this.attendancesRepository.save(activeAttendance);
  }

  private async garantirMonitorNoMesmoAmbiente(
    actor: TokenPayload,
    targetAttendance: Attendance,
  ): Promise<void> {
    if (actor.role !== UserRole.Monitor) {
      return;
    }

    const monitorAttendance = await this.attendancesRepository.findOne({
      where: {
        userId: actor.sub,
        exitAt: IsNull(),
      },
    });

    if (
      !monitorAttendance ||
      monitorAttendance.spaceId !== targetAttendance.spaceId
    ) {
      throw new ForbiddenException(
        'Monitor só pode encerrar presenças do próprio ambiente.',
      );
    }
  }
}
