import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
import { Exclude } from "class-transformer";

@Entity()
export class Profile {
  @Exclude()
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  bio?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  picture?: string;

  @OneToOne(() => User, user => user.profile)
  @JoinColumn()
  user: User;

}