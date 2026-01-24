import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Address {

  @PrimaryGeneratedColumn()
  id: number;
  
  @Column()
  county: string;

  @Column()
  locality: string;

  @Column()
  street: string;

  @Column()
  streetNumber: string;

  @Column({ nullable: true })
  building: string;

  @Column({ nullable: true })
  stair: string;

  @Column({ nullable: true })
  floor: string;

  @Column({ nullable: true })
  apartment: string;

}