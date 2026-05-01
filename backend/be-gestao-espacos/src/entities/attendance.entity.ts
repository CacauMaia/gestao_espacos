import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Space } from './space.entity';

@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId: string;

  @Column({ name: 'space_id', type: 'char', length: 36 })
  spaceId: string;

  @Column({ name: 'entry_at', type: 'timestamp' })
  entryAt: Date;

  @Column({ name: 'expected_exit_at', type: 'timestamp' })
  expectedExitAt: Date;

  @Column({ name: 'exit_at', type: 'timestamp', nullable: true })
  exitAt: Date | null;

  @Column({ name: 'overstay_notified_at', type: 'timestamp', nullable: true })
  overstayNotifiedAt: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Space, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'space_id' })
  space: Space;
}
