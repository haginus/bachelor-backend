import { User } from "src/users/entities/user.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Signature {

  @PrimaryGeneratedColumn()
  id: number;

  @Column('int')
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}