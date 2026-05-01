import { SpaceType } from '../../entities/space.entity';

export class UpdateSpaceDto {
  name?: string;
  type?: SpaceType;
  capacity?: number;
}
