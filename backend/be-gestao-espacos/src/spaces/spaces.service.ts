import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOptionsWhere, Like, Repository } from 'typeorm';
import {
  buildPaginatedResponse,
  PaginatedResponse,
  parsePaginationQuery,
  PaginationQuery,
} from '../common/pagination/pagination';
import { Space, SpaceType } from '../entities/space.entity';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

interface ListSpacesQuery extends PaginationQuery {
  type?: string;
  search?: string;
}

@Injectable()
export class SpacesService {
  constructor(
    @InjectRepository(Space)
    private readonly spacesRepository: Repository<Space>,
  ) {}

  async create(createSpaceDto: CreateSpaceDto): Promise<Space> {
    this.validarDados(createSpaceDto);

    const space = this.spacesRepository.create(createSpaceDto);

    return this.spacesRepository.save(space);
  }

  async list(
    query: ListSpacesQuery = {},
  ): Promise<Space[] | PaginatedResponse<Space>> {
    const type = this.parseTipoFiltro(query.type);
    const where = this.buildListWhere(type, query.search);
    const pagination = parsePaginationQuery(query);

    const findOptions: FindManyOptions<Space> = {
      where,
      order: { name: 'ASC' },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    };

    if (!pagination) {
      return this.spacesRepository.find(findOptions);
    }

    const [items, totalItems] =
      await this.spacesRepository.findAndCount(findOptions);

    return buildPaginatedResponse(items, totalItems, pagination);
  }

  async findById(id: string): Promise<Space> {
    const space = await this.spacesRepository.findOne({ where: { id } });

    if (!space) {
      throw new NotFoundException('Space não encontrado.');
    }

    return space;
  }

  async update(id: string, updateSpaceDto: UpdateSpaceDto): Promise<Space> {
    const space = await this.findById(id);

    if (updateSpaceDto.capacity !== undefined) {
      this.validarCapacidade(updateSpaceDto.capacity);
    }

    if (updateSpaceDto.type !== undefined) {
      this.validarTipo(updateSpaceDto.type);
    }

    const spaceAtualizado = this.spacesRepository.merge(space, updateSpaceDto);

    return this.spacesRepository.save(spaceAtualizado);
  }

  async remove(id: string): Promise<void> {
    const space = await this.findById(id);

    await this.spacesRepository.remove(space);
  }

  private validarDados(createSpaceDto: CreateSpaceDto): void {
    if (!createSpaceDto.name || !createSpaceDto.type) {
      throw new BadRequestException('Nome e type são obrigatórios.');
    }

    this.validarTipo(createSpaceDto.type);
    this.validarCapacidade(createSpaceDto.capacity);
  }

  private validarCapacidade(capacity: number): void {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new BadRequestException('Capacidade deve ser maior que zero.');
    }
  }

  private validarTipo(type: SpaceType): void {
    if (!Object.values(SpaceType).includes(type)) {
      throw new BadRequestException('Tipo de space inválido.');
    }
  }

  private parseTipoFiltro(type?: string): SpaceType | undefined {
    if (type === undefined) {
      return undefined;
    }

    this.validarTipo(type as SpaceType);

    return type as SpaceType;
  }

  private buildListWhere(
    type?: SpaceType,
    search?: string,
  ): FindOptionsWhere<Space> | FindOptionsWhere<Space>[] {
    const baseWhere: FindOptionsWhere<Space> = {
      ...(type ? { type } : {}),
    };
    const termoBusca = search?.trim();

    if (!termoBusca) {
      return baseWhere;
    }

    return [{ ...baseWhere, name: Like(`%${termoBusca}%`) }];
  }
}
