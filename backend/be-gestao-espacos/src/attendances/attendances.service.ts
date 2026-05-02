import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindManyOptions,
  FindOptionsWhere,
  IsNull,
  Like,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import {
  buildPaginatedResponse,
  PaginatedResponse,
  parsePaginationQuery,
  PaginationQuery,
} from '../common/pagination/pagination';
import { User, UserRole } from '../entities/user.entity';
import { Space, SpaceType } from '../entities/space.entity';
import { Attendance, CheckoutReason } from '../entities/attendance.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { CheckInUseCase } from './application/use-cases/check-in.use-case';
import { TokenPayload } from '../auth/services/token.service';
import { CheckOutUseCase } from './application/use-cases/check-out.use-case';
import { ForceCheckOutUseCase } from './application/use-cases/force-check-out.use-case';
import { CleanupExpiredAttendancesUseCase } from './application/use-cases/cleanup-expired-attendances.use-case';

type AttendanceNotification = {
  attendanceId: string;
  type: 'leaving_soon' | 'overdue';
  spaceId: string;
  spaceName: string;
  spaceType: string;
  entryAt: Date;
  expectedExitAt: Date;
  exceededMinutes: number;
  message: string;
};

interface ListActiveAttendancesQuery extends PaginationQuery {
  userId?: string;
  spaceId?: string;
  role?: UserRole;
  spaceType?: string;
  search?: string;
}

interface ListAttendanceHistoryQuery extends ListActiveAttendancesQuery {
  checkoutReason?: CheckoutReason;
  from?: string;
  to?: string;
}

@Injectable()
export class AttendancesService {
  private readonly leavingSoonThresholdMs = 10 * 60 * 1000;

  constructor(
    @InjectRepository(Attendance)
    private readonly attendancesRepository: Repository<Attendance>,
    @InjectRepository(Space)
    private readonly spacesRepository: Repository<Space>,
    private readonly checkInUseCase: CheckInUseCase,
    private readonly checkOutUseCase: CheckOutUseCase,
    private readonly forceCheckOutUseCase: ForceCheckOutUseCase,
    private readonly cleanupExpiredAttendancesUseCase: CleanupExpiredAttendancesUseCase,
  ) {}

  async checkIn(
    userId: string,
    createAttendanceDto: CreateAttendanceDto,
  ): Promise<Attendance> {
    await this.cleanupExpiredAttendances();

    return this.checkInUseCase.execute(userId, createAttendanceDto);
  }

  async checkOut(userId: string): Promise<Attendance> {
    return this.checkOutUseCase.execute(userId);
  }

  async forceCheckOut(
    attendanceId: string,
    actor: TokenPayload,
    note?: string,
  ): Promise<Attendance> {
    return this.forceCheckOutUseCase.execute(attendanceId, actor, note);
  }

  async listActive(
    query: ListActiveAttendancesQuery = {},
    actor?: TokenPayload,
  ): Promise<Attendance[] | PaginatedResponse<Attendance>> {
    await this.cleanupExpiredAttendances();
    this.validarRoleFiltro(query.role);
    const spaceType = this.parseSpaceTypeFilter(query.spaceType);
    const pagination = parsePaginationQuery(query);
    const scopedQuery = await this.aplicarEscopoPresencasAtivas(query, actor);

    if (!scopedQuery) {
      return pagination ? buildPaginatedResponse([], 0, pagination) : [];
    }

    const findOptions: FindManyOptions<Attendance> = {
      where: this.buildActiveWhere(scopedQuery, spaceType),
      relations: {
        user: true,
        space: true,
      },
      order: {
        entryAt: 'DESC',
      },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    };

    if (!pagination) {
      return this.attendancesRepository.find(findOptions);
    }

    const [items, totalItems] =
      await this.attendancesRepository.findAndCount(findOptions);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  private async aplicarEscopoPresencasAtivas(
    query: ListActiveAttendancesQuery,
    actor?: TokenPayload,
  ): Promise<ListActiveAttendancesQuery | null> {
    if (actor?.role !== UserRole.Monitor) {
      return query;
    }

    const monitorAttendance = await this.buscarPresencaAtivaDoMonitor(
      actor.sub,
    );

    if (!monitorAttendance) {
      return null;
    }

    return {
      ...query,
      spaceId: monitorAttendance.spaceId,
    };
  }

  async listHistory(
    query: ListAttendanceHistoryQuery = {},
    actor?: TokenPayload,
  ): Promise<Attendance[] | PaginatedResponse<Attendance>> {
    await this.cleanupExpiredAttendances();
    this.validarRoleFiltro(query.role);
    this.validarCheckoutReasonFiltro(query.checkoutReason);
    const spaceType = this.parseSpaceTypeFilter(query.spaceType);
    const pagination = parsePaginationQuery(query);
    const scopedQuery = this.aplicarEscopoHistorico(query, actor);

    if (!scopedQuery) {
      return pagination ? buildPaginatedResponse([], 0, pagination) : [];
    }

    const findOptions: FindManyOptions<Attendance> = {
      where: this.buildHistoryWhere(scopedQuery, spaceType, actor),
      relations: {
        user: true,
        space: true,
        closedByUser: true,
      },
      order: {
        entryAt: 'DESC',
      },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    };

    if (!pagination) {
      return this.attendancesRepository.find(findOptions);
    }

    const [items, totalItems] =
      await this.attendancesRepository.findAndCount(findOptions);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  private aplicarEscopoHistorico(
    query: ListAttendanceHistoryQuery,
    actor?: TokenPayload,
  ): ListAttendanceHistoryQuery | null {
    if (actor?.role === UserRole.Student || actor?.role === UserRole.Monitor) {
      return {
        ...query,
        userId: actor.sub,
        spaceId: undefined,
      };
    }

    return query;
  }

  private buscarPresencaAtivaDoMonitor(
    monitorId: string,
  ): Promise<Attendance | null> {
    return this.attendancesRepository.findOne({
      where: {
        userId: monitorId,
        exitAt: IsNull(),
      },
    });
  }

  async listCurrent(userId: string): Promise<Attendance | null> {
    await this.cleanupExpiredAttendances();

    return this.attendancesRepository.findOne({
      where: {
        userId,
        exitAt: IsNull(),
      },
      relations: {
        user: true,
        space: true,
      },
    });
  }

  async listNotifications(userId: string): Promise<AttendanceNotification[]> {
    await this.cleanupExpiredAttendances();

    const activeAttendance = await this.attendancesRepository.findOne({
      where: {
        userId,
        exitAt: IsNull(),
      },
      relations: {
        space: true,
      },
    });

    if (!activeAttendance || !this.deveNotificar(activeAttendance)) {
      return [];
    }

    if (
      this.presencaExpirada(activeAttendance) &&
      !activeAttendance.overstayNotifiedAt
    ) {
      activeAttendance.overstayNotifiedAt = new Date();
      await this.attendancesRepository.save(activeAttendance);
    }

    return [this.criarNotificacao(activeAttendance)];
  }

  async listOccupancy() {
    await this.cleanupExpiredAttendances();

    const spaces = await this.spacesRepository.find({
      order: { name: 'ASC' },
    });
    const occupancyBySpace = new Map(
      (
        await this.attendancesRepository
          .createQueryBuilder('attendance')
          .select('attendance.spaceId', 'spaceId')
          .addSelect('COUNT(attendance.id)', 'currentOccupancy')
          .where('attendance.exitAt IS NULL')
          .groupBy('attendance.spaceId')
          .getRawMany<{ spaceId: string; currentOccupancy: string }>()
      ).map((item) => [item.spaceId, Number(item.currentOccupancy)]),
    );

    return spaces.map((space) => {
      const currentOccupancy = occupancyBySpace.get(space.id) ?? 0;

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
    });
  }

  private buildActiveWhere(
    query: ListActiveAttendancesQuery,
    spaceType?: SpaceType,
  ): FindOptionsWhere<Attendance> | FindOptionsWhere<Attendance>[] {
    const userWhere: FindOptionsWhere<User> = {
      ...(query.role ? { role: query.role } : {}),
    };
    const spaceWhere: FindOptionsWhere<Space> = {
      ...(spaceType ? { type: spaceType } : {}),
    };
    const baseWhere: FindOptionsWhere<Attendance> = {
      exitAt: IsNull(),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.spaceId ? { spaceId: query.spaceId } : {}),
      ...(Object.keys(userWhere).length ? { user: userWhere } : {}),
      ...(Object.keys(spaceWhere).length ? { space: spaceWhere } : {}),
    };
    const termoBusca = query.search?.trim();

    if (!termoBusca) {
      return baseWhere;
    }

    return [
      {
        ...baseWhere,
        user: { ...userWhere, name: Like(`%${termoBusca}%`) },
      },
      {
        ...baseWhere,
        user: { ...userWhere, email: Like(`%${termoBusca}%`) },
      },
      {
        ...baseWhere,
        space: { ...spaceWhere, name: Like(`%${termoBusca}%`) },
      },
    ];
  }

  private buildHistoryWhere(
    query: ListAttendanceHistoryQuery,
    spaceType?: SpaceType,
    actor?: TokenPayload,
  ): FindOptionsWhere<Attendance> | FindOptionsWhere<Attendance>[] {
    const isOwnHistoryActor =
      actor?.role === UserRole.Student || actor?.role === UserRole.Monitor;
    const scopedUserId = isOwnHistoryActor ? actor?.sub : query.userId;
    const userWhere: FindOptionsWhere<User> = {
      ...(query.role ? { role: query.role } : {}),
    };
    const spaceWhere: FindOptionsWhere<Space> = {
      ...(spaceType ? { type: spaceType } : {}),
    };
    const baseWhere: FindOptionsWhere<Attendance> = {
      exitAt: Not(IsNull()),
      ...(scopedUserId ? { userId: scopedUserId } : {}),
      ...(query.spaceId ? { spaceId: query.spaceId } : {}),
      ...(query.checkoutReason ? { checkoutReason: query.checkoutReason } : {}),
      ...this.buildDateWhere(query),
      ...(Object.keys(userWhere).length ? { user: userWhere } : {}),
      ...(Object.keys(spaceWhere).length ? { space: spaceWhere } : {}),
    };
    const termoBusca = query.search?.trim();

    if (!termoBusca) {
      return baseWhere;
    }

    return [
      {
        ...baseWhere,
        user: { ...userWhere, name: Like(`%${termoBusca}%`) },
      },
      {
        ...baseWhere,
        user: { ...userWhere, email: Like(`%${termoBusca}%`) },
      },
      {
        ...baseWhere,
        space: { ...spaceWhere, name: Like(`%${termoBusca}%`) },
      },
    ];
  }

  private buildDateWhere(
    query: ListAttendanceHistoryQuery,
  ): FindOptionsWhere<Attendance> {
    const where: FindOptionsWhere<Attendance> = {};

    if (query.from && query.to) {
      where.entryAt = Between(
        this.parseDataFiltro(query.from, 'from'),
        this.parseDataFiltro(query.to, 'to'),
      );
      return where;
    }

    if (query.from) {
      where.entryAt = MoreThanOrEqual(this.parseDataFiltro(query.from, 'from'));
    } else if (query.to) {
      where.entryAt = LessThanOrEqual(this.parseDataFiltro(query.to, 'to'));
    }

    return where;
  }

  async cleanupExpiredAttendances(): Promise<void> {
    await this.cleanupExpiredAttendancesUseCase.execute();
  }

  private validarRoleFiltro(role?: UserRole): void {
    if (role && !Object.values(UserRole).includes(role)) {
      throw new BadRequestException('Role inválida.');
    }
  }

  private parseSpaceTypeFilter(spaceType?: string): SpaceType | undefined {
    if (spaceType === undefined) {
      return undefined;
    }

    if (!Object.values(SpaceType).includes(spaceType as SpaceType)) {
      throw new BadRequestException('Tipo de space inválido.');
    }

    return spaceType as SpaceType;
  }

  private validarCheckoutReasonFiltro(checkoutReason?: CheckoutReason): void {
    if (
      checkoutReason &&
      !Object.values(CheckoutReason).includes(checkoutReason)
    ) {
      throw new BadRequestException('Motivo de saída inválido.');
    }
  }

  private parseDataFiltro(value: string, field: string): Date {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Filtro ${field} inválido.`);
    }

    return date;
  }

  private presencaExpirada(attendance: Attendance): boolean {
    return attendance.expectedExitAt.getTime() < Date.now();
  }

  private deveNotificar(attendance: Attendance): boolean {
    return (
      this.presencaExpirada(attendance) ||
      attendance.expectedExitAt.getTime() - Date.now() <=
        this.leavingSoonThresholdMs
    );
  }

  private criarNotificacao(attendance: Attendance): AttendanceNotification {
    const expired = this.presencaExpirada(attendance);

    return {
      attendanceId: attendance.id,
      type: expired ? 'overdue' : 'leaving_soon',
      spaceId: attendance.spaceId,
      spaceName: attendance.space.name,
      spaceType: attendance.space.type,
      entryAt: attendance.entryAt,
      expectedExitAt: attendance.expectedExitAt,
      exceededMinutes: expired
        ? Math.floor((Date.now() - attendance.expectedExitAt.getTime()) / 60000)
        : 0,
      message: expired
        ? 'Tempo de permanência excedido. Deixe o ambiente imediatamente.'
        : 'Seu tempo de permanência termina em menos de 10 minutos.',
    };
  }
}
