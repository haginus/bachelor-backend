import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { JwtPayload } from "../../lib/interfaces/jwt-payload.interface";

@Entity()
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id!: number;

  token!: string;

  @Column('int')
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'simple-json', nullable: true })
  additionalPayload: Partial<JwtPayload> | null = null;

  @Column()
  expiresAt!: Date;

  @Column({ nullable: true })
  revokedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  isAvailable() {
    return !this.revokedAt && this.expiresAt > new Date();
  }
}
