import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Space, SpaceType } from '../entities/space.entity';
import { Attendance } from '../entities/attendance.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

type AttendanceNotification = {
  attendanceId: string;
  spaceId: string;
  spaceName: string;
  spaceType: string;
  entryAt: Date;
  expectedExitAt: Date;
  exceededMinutes: number;
  message: string;
};

@Injectable()
export class AttendancesService {
  private readonly classroomPeriods = [
    { startMinutes: 7 * 60 + 30, endMinutes: 11 * 60 + 30 },
    { startMinutes: 13 * 60, endMinutes: 17 * 60 },
    { startMinutes: 19 * 60, endMinutes: 22 * 60 + 30 },
  ];

  constructor(
    @InjectRepository(Attendance)
    private readonly attendancesRepository: Repository<Attendance>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Space)
    private readonly spacesRepository: Repository<Space>,
  ) {}

  async checkIn(
    userId: string,
    createAttendanceDto: CreateAttendanceDto,
  ): Promise<Attendance> {
    const { spaceId } = createAttendanceDto;

    const [user, space] = await Promise.all([
      this.usersRepository.findOne({ where: { id: userId } }),
      this.spacesRepository.findOne({ where: { id: spaceId } }),
    ]);

    if (!user) {
      throw new NotFoundException('User não encontrado.');
    }

    if (![UserRole.Student, UserRole.Monitor].includes(user.role)) {
      throw new BadRequestException(
        'Apenas alunos e monitores podem marcar presença.',
      );
    }

    if (!space) {
      throw new NotFoundException('Space não encontrado.');
    }

    const activeAttendance = await this.attendancesRepository.findOne({
      where: {
        userId,
        exitAt: IsNull(),
      },
    });

    if (activeAttendance) {
      throw new ConflictException('User já possui presença ativa.');
    }

    const currentOccupancy = await this.attendancesRepository.count({
      where: {
        spaceId,
        exitAt: IsNull(),
      },
    });

    if (currentOccupancy >= space.capacity) {
      throw new ConflictException('Space está cheio.');
    }

    const entryAt = new Date();
    const expectedExitAt = this.calcularSaidaEsperada(space, entryAt);

    const attendance = this.attendancesRepository.create({
      user,
      userId,
      space,
      spaceId,
      entryAt,
      expectedExitAt,
      exitAt: null,
      overstayNotifiedAt: null,
    });

    return this.attendancesRepository.save(attendance);
  }

  async checkOut(userId: string): Promise<Attendance> {
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

    return this.attendancesRepository.save(activeAttendance);
  }

  listActive(): Promise<Attendance[]> {
    return this.attendancesRepository.find({
      where: {
        exitAt: IsNull(),
      },
      relations: {
        user: true,
        space: true,
      },
      order: {
        entryAt: 'DESC',
      },
    });
  }

  async listNotifications(userId: string): Promise<AttendanceNotification[]> {
    const activeAttendance = await this.attendancesRepository.findOne({
      where: {
        userId,
        exitAt: IsNull(),
      },
      relations: {
        space: true,
      },
    });

    if (!activeAttendance || !this.presencaExpirada(activeAttendance)) {
      return [];
    }

    if (!activeAttendance.overstayNotifiedAt) {
      activeAttendance.overstayNotifiedAt = new Date();
      await this.attendancesRepository.save(activeAttendance);
    }

    return [this.criarNotificacao(activeAttendance)];
  }

  async listOccupancy() {
    const spaces = await this.spacesRepository.find({
      order: { name: 'ASC' },
    });

    return Promise.all(
      spaces.map(async (space) => {
        const currentOccupancy = await this.attendancesRepository.count({
          where: {
            spaceId: space.id,
            exitAt: IsNull(),
          },
        });

        return {
          spaceId: space.id,
          name: space.name,
          type: space.type,
          capacity: space.capacity,
          currentOccupancy,
          availableSlots: space.capacity - currentOccupancy,
          occupancyPercentage: Math.round(
            (currentOccupancy / space.capacity) * 100,
          ),
        };
      }),
    );
  }

  private calcularSaidaEsperada(space: Space, entryAt: Date): Date {
    if (space.type === SpaceType.Laboratory) {
      return this.adicionarHoras(entryAt, 1);
    }

    if (space.type === SpaceType.Study) {
      return this.adicionarHoras(entryAt, 3);
    }

    return this.calcularSaidaSalaDeAula(entryAt);
  }

  private calcularSaidaSalaDeAula(entryAt: Date): Date {
    const dataLocal = this.obterDataLocal(entryAt);
    const minutoAtual = dataLocal.hour * 60 + dataLocal.minute;
    const periodoAtual = this.classroomPeriods.find(
      (periodo) =>
        minutoAtual >= periodo.startMinutes && minutoAtual < periodo.endMinutes,
    );

    if (!periodoAtual) {
      throw new BadRequestException(
        'Salas de aula permitem entrada apenas entre 07:30-11:30, 13:00-17:00 ou 19:00-22:30.',
      );
    }

    return this.criarDataSaoPaulo(
      dataLocal.year,
      dataLocal.month,
      dataLocal.day,
      Math.floor(periodoAtual.endMinutes / 60),
      periodoAtual.endMinutes % 60,
    );
  }

  private obterDataLocal(date: Date) {
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const valor = (type: Intl.DateTimeFormatPartTypes) =>
      Number(partes.find((parte) => parte.type === type)?.value);

    return {
      year: valor('year'),
      month: valor('month'),
      day: valor('day'),
      hour: valor('hour'),
      minute: valor('minute'),
    };
  }

  private criarDataSaoPaulo(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
  ): Date {
    return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, 0, 0));
  }

  private adicionarHoras(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }

  private presencaExpirada(attendance: Attendance): boolean {
    return attendance.expectedExitAt.getTime() < Date.now();
  }

  private criarNotificacao(
    attendance: Attendance,
  ): AttendanceNotification {
    return {
      attendanceId: attendance.id,
      spaceId: attendance.spaceId,
      spaceName: attendance.space.name,
      spaceType: attendance.space.type,
      entryAt: attendance.entryAt,
      expectedExitAt: attendance.expectedExitAt,
      exceededMinutes: Math.floor(
        (Date.now() - attendance.expectedExitAt.getTime()) / 60000,
      ),
      message:
        'Tempo de permanência excedido. Deixe o ambiente imediatamente.',
    };
  }
}
