import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Space, SpaceType } from '../entities/space.entity';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

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

  list(): Promise<Space[]> {
    return this.spacesRepository.find({
      order: { name: 'ASC' },
    });
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
}
