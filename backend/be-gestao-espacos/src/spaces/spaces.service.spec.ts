import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Like } from 'typeorm';
import { Space, SpaceType } from '../entities/space.entity';
import { SpacesService } from './spaces.service';

describe('SpacesService', () => {
  let service: SpacesService;
  let spacesRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    findAndCount: jest.Mock;
    create: jest.Mock;
    merge: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };

  const space: Space = {
    id: 'space-id',
    name: 'Laboratório 1',
    type: SpaceType.Laboratory,
    capacity: 2,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    spacesRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      merge: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpacesService,
        {
          provide: getRepositoryToken(Space),
          useValue: spacesRepository,
        },
      ],
    }).compile();

    service = module.get<SpacesService>(SpacesService);
  });

  it('deve create space com capacity válida', async () => {
    const dto = {
      name: space.name,
      type: space.type,
      capacity: space.capacity,
    };

    spacesRepository.create.mockReturnValue(dto);
    spacesRepository.save.mockResolvedValue(space);

    const result = await service.create(dto);

    expect(spacesRepository.create).toHaveBeenCalledWith(dto);
    expect(spacesRepository.save).toHaveBeenCalledWith(dto);
    expect(result).toEqual(space);
  });

  it('deve lançar erro se capacity for menor ou igual a zero', async () => {
    await expect(
      service.create({
        name: space.name,
        type: space.type,
        capacity: 0,
      }),
    ).rejects.toThrow('Capacidade deve ser maior que zero.');
    expect(spacesRepository.save).not.toHaveBeenCalled();
  });

  it('deve lançar erro se space não existir', async () => {
    spacesRepository.findOne.mockResolvedValue(null);

    await expect(service.findById('space-inexistente')).rejects.toThrow(
      'Space não encontrado.',
    );
  });

  it('deve atualizar space com dados válidos', async () => {
    const dto = {
      name: 'Sala B',
      type: SpaceType.Classroom,
      capacity: 30,
    };
    const updatedSpace = { ...space, ...dto };
    spacesRepository.findOne.mockResolvedValue(space);
    spacesRepository.merge.mockReturnValue(updatedSpace);
    spacesRepository.save.mockResolvedValue(updatedSpace);

    const result = await service.update(space.id, dto);

    expect(spacesRepository.merge).toHaveBeenCalledWith(space, dto);
    expect(spacesRepository.save).toHaveBeenCalledWith(updatedSpace);
    expect(result).toEqual(updatedSpace);
  });

  it('deve filtrar spaces por tipo e nome', async () => {
    spacesRepository.find.mockResolvedValue([space]);

    const result = await service.list({
      type: SpaceType.Laboratory,
      search: 'Lab',
    });

    expect(spacesRepository.find).toHaveBeenCalledWith({
      where: [{ type: SpaceType.Laboratory, name: Like('%Lab%') }],
      order: { name: 'ASC' },
    });
    expect(result).toEqual([space]);
  });

  it('deve paginar spaces', async () => {
    spacesRepository.findAndCount.mockResolvedValue([[space], 11]);

    const result = await service.list({
      page: '2',
      limit: '5',
    });

    expect(spacesRepository.findAndCount).toHaveBeenCalledWith({
      where: {},
      order: { name: 'ASC' },
      skip: 5,
      take: 5,
    });
    expect(result).toEqual({
      items: [space],
      meta: {
        page: 2,
        limit: 5,
        totalItems: 11,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      },
    });
  });

  it('deve validar filtro de tipo', async () => {
    await expect(service.list({ type: 'auditorium' })).rejects.toThrow(
      'Tipo de space inválido.',
    );
    expect(spacesRepository.find).not.toHaveBeenCalled();
  });
});
