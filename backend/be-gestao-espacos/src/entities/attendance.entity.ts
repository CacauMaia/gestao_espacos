import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Space } from './space.entity';

export enum CheckoutReason {
  Manual = 'manual',
  AutoExpired = 'auto_expired',
  Forced = 'forced',
}

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

  @Column({
    name: 'checkout_reason',
    type: 'enum',
    enum: CheckoutReason,
    nullable: true,
  })
  checkoutReason: CheckoutReason | null;

  @Column({
    name: 'closed_by_user_id',
    type: 'char',
    length: 36,
    nullable: true,
  })
  closedByUserId: string | null;

  @Column({
    name: 'checkout_note',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  checkoutNote: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Space, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'space_id' })
  space: Space;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'closed_by_user_id' })
  closedByUser: User | null;
}
