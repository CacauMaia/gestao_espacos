import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindManyOptions,
  FindOptionsWhere,
  Like,
  Not,
  Repository,
} from 'typeorm';
import { PasswordService } from '../auth/services/password.service';
import {
  buildPaginatedResponse,
  PaginatedResponse,
  parsePaginationQuery,
  PaginationQuery,
} from '../common/pagination/pagination';
import { TokenPayload } from '../auth/services/token.service';
import { User, UserRole } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

interface ListUsersQuery extends PaginationQuery {
  role?: UserRole;
  search?: string;
  active?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly passwordService: PasswordService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    this.validarDadosObrigatorios(createUserDto);
    this.validarRole(createUserDto.role);
    await this.validarEmailUnico(createUserDto.email);

    const user = this.usersRepository.create({
      ...createUserDto,
      role: createUserDto.role ?? UserRole.Student,
      password: this.passwordService.hash(createUserDto.password),
    });

    return this.usersRepository.save(user);
  }

  async list(
    query: ListUsersQuery = {},
  ): Promise<User[] | PaginatedResponse<User>> {
    this.validarRole(query.role);
    const active = this.parseActiveFilter(query.active);

    const where = this.buildListWhere(query.role, query.search, active);
    const pagination = parsePaginationQuery(query);

    const findOptions: FindManyOptions<User> = {
      where,
      order: { name: 'ASC' },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    };

    if (!pagination) {
      return this.usersRepository.find(findOptions);
    }

    const [items, totalItems] =
      await this.usersRepository.findAndCount(findOptions);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User não encontrado.');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (updateUserDto.email) {
      await this.validarEmailUnico(updateUserDto.email, id);
    }

    if (updateUserDto.active !== undefined && user.role === UserRole.Admin) {
      throw new ForbiddenException(
        'Administrador não pode ser ativado ou desativado.',
      );
    }

    this.validarRole(updateUserDto.role);

    const updatedUser = this.usersRepository.merge(user, {
      ...updateUserDto,
      ...(updateUserDto.password
        ? { password: this.passwordService.hash(updateUserDto.password) }
        : {}),
    });

    return this.usersRepository.save(updatedUser);
  }

  async remove(id: string, currentUser: TokenPayload): Promise<void> {
    const user = await this.findById(id);

    if (currentUser.sub === id) {
      throw new ForbiddenException('Administrador não pode se autodeletar.');
    }

    if (user.role === UserRole.Admin) {
      throw new ForbiddenException(
        'Administrador não pode deletar outro administrador.',
      );
    }

    if (!user.active) {
      return;
    }

    user.active = false;
    await this.usersRepository.save(user);
  }

  private validarDadosObrigatorios(createUserDto: CreateUserDto): void {
    if (
      !createUserDto.name ||
      !createUserDto.email ||
      !createUserDto.password
    ) {
      throw new BadRequestException('Nome, email e password são obrigatórios.');
    }
  }

  private async validarEmailUnico(email: string, id?: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: {
        email,
        ...(id ? { id: Not(id) } : {}),
      },
    });

    if (user) {
      throw new ConflictException('Email já cadastrado.');
    }
  }

  private validarRole(role?: UserRole): void {
    if (role && !Object.values(UserRole).includes(role)) {
      throw new BadRequestException('Role inválida.');
    }
  }

  private buildListWhere(
    role?: UserRole,
    search?: string,
    active?: boolean,
  ): FindOptionsWhere<User> | FindOptionsWhere<User>[] {
    const baseWhere: FindOptionsWhere<User> = {
      ...(role ? { role } : {}),
      ...(active !== undefined ? { active } : {}),
    };
    const termoBusca = search?.trim();

    if (!termoBusca) {
      return baseWhere;
    }

    return [
      { ...baseWhere, name: Like(`%${termoBusca}%`) },
      { ...baseWhere, email: Like(`%${termoBusca}%`) },
    ];
  }

  private parseActiveFilter(active?: string): boolean | undefined {
    if (active === undefined) {
      return undefined;
    }

    if (active === 'true') {
      return true;
    }

    if (active === 'false') {
      return false;
    }

    throw new BadRequestException('active deve ser true ou false.');
  }
}
