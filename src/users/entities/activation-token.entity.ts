import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "./user.entity";

@Entity()
export class ActivationToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index({ unique: true })
  token: string;

  @Column()
  userId: number;

  @Column({ default: false })
  used: boolean;

  @ManyToOne(() => User)
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}