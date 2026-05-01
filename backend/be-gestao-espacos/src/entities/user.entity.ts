import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum UserRole {
  Admin = 'ADMIN',
  Student = 'STUDENT',
  Monitor = 'MONITOR',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ name: 'password', type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.Student })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  toJSON() {
    const { password: _password, ...user } = this;
    return user;
  }
}
