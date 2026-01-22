import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Topic {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;
}