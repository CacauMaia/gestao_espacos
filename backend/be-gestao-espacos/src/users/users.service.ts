import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Like, Not, Repository } from 'typeorm';
import { PasswordService } from '../auth/services/password.service';
import { User, UserRole } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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

  list(role?: UserRole, search?: string): Promise<User[]> {
    this.validarRole(role);

    const termoBusca = search?.trim();
    const where: FindOptionsWhere<User> = {
      ...(role ? { role } : {}),
      ...(termoBusca ? { name: Like(`%${termoBusca}%`) } : {}),
    };

    return this.usersRepository.find({
      where,
      order: { name: 'ASC' },
    });
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

    this.validarRole(updateUserDto.role);

    const updatedUser = this.usersRepository.merge(user, {
      ...updateUserDto,
      ...(updateUserDto.password
        ? { password: this.passwordService.hash(updateUserDto.password) }
        : {}),
    });

    return this.usersRepository.save(updatedUser);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);

    await this.usersRepository.remove(user);
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
}
