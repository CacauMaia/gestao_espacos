import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Space, SpaceType } from '../entities/space.entity';
import { SpacesService } from './spaces.service';

describe('SpacesService', () => {
  let service: SpacesService;
  let spacesRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
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
});
