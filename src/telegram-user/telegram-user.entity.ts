import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('telegram_users')
export class TelegramUser {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'telegramId', nullable: false, unique: true })
  telegramId: string;

  @Column({ name: 'username', nullable: true, unique: false })
  username: string;

  @Column({ name: 'firstName', nullable: true, unique: false })
  firstName: string;

  @Column({ name: 'isActive', default: true, unique: false })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
