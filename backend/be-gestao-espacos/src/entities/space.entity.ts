import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum SpaceType {
  Classroom = 'classroom',
  Laboratory = 'laboratory',
  Study = 'study',
}

@Entity('spaces')
export class Space {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'type', type: 'enum', enum: SpaceType })
  type: SpaceType;

  @Column({ name: 'capacity', type: 'int' })
  capacity: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
