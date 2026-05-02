import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Space, SpaceType } from '../../entities/space.entity';
import { User, UserRole } from '../../entities/user.entity';

@Injectable()
export class CheckInPolicy {
  private readonly minimumClassroomRemainingMinutes = 50;
  private readonly classroomPeriods = [
    { startMinutes: 7 * 60 + 30, endMinutes: 11 * 60 + 30 },
    { startMinutes: 13 * 60, endMinutes: 17 * 60 },
    { startMinutes: 19 * 60, endMinutes: 22 * 60 + 30 },
  ];

  public assertUserCanCheckIn(user: User): void {
    if (!user.active) {
      throw new BadRequestException(
        'User desativado não pode entrar em nenhum ambiente de ensino.',
      );
    }

    if (![UserRole.Student, UserRole.Monitor].includes(user.role)) {
      throw new BadRequestException(
        'Apenas alunos e monitores podem marcar presença.',
      );
    }
  }

  public assertUserHasNoActiveAttendance(hasActiveAttendance: boolean): void {
    if (hasActiveAttendance) {
      throw new ConflictException('User já possui presença ativa.');
    }
  }

  public assertSpaceHasCapacity(space: Space, currentOccupancy: number): void {
    if (currentOccupancy >= space.capacity) {
      throw new ConflictException('Space está cheio.');
    }
  }

  public calculateExpectedExitAt(space: Space, entryAt: Date): Date {
    if (space.type === SpaceType.Laboratory) {
      return this.addHours(entryAt, 1);
    }

    if (space.type === SpaceType.Study) {
      return this.addHours(entryAt, 3);
    }

    return this.calculateClassroomExpectedExitAt(entryAt);
  }

  private calculateClassroomExpectedExitAt(entryAt: Date): Date {
    const localDate = this.getLocalDate(entryAt);
    const currentMinute = localDate.hour * 60 + localDate.minute;
    const currentPeriod = this.classroomPeriods.find(
      (period) =>
        currentMinute >= period.startMinutes &&
        currentMinute < period.endMinutes,
    );

    if (!currentPeriod) {
      throw new BadRequestException(
        'Salas de aula permitem entrada apenas entre 07:30-11:30, 13:00-17:00 ou 19:00-22:30.',
      );
    }

    if (
      currentPeriod.endMinutes - currentMinute <=
      this.minimumClassroomRemainingMinutes
    ) {
      throw new BadRequestException(
        'Entrada em sala de aula bloqueada quando faltam menos de 50 minutos para o fim do período.',
      );
    }

    return this.createSaoPauloDate(
      localDate.year,
      localDate.month,
      localDate.day,
      Math.floor(currentPeriod.endMinutes / 60),
      currentPeriod.endMinutes % 60,
    );
  }

  private getLocalDate(date: Date) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const value = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value);

    return {
      year: value('year'),
      month: value('month'),
      day: value('day'),
      hour: value('hour'),
      minute: value('minute'),
    };
  }

  private createSaoPauloDate(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
  ): Date {
    return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, 0, 0));
  }

  private addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }
}
