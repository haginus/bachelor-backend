import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Profile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  bio?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  picture?: string;

}