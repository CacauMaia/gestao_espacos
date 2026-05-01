import { SpaceType } from '../../entities/space.entity';

export class CreateSpaceDto {
  name: string;
  type: SpaceType;
  capacity: number;
}
