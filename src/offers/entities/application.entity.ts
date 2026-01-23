import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Offer } from "./offer.entity";
import { Student } from "src/users/entities/user.entity";

@Entity()
export class Application {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'varchar', length: 1024 })
  description: string;

  @Column({ nullable: true })
  usedTechnologies: string;

  @Column({ nullable: true })
  accepted: boolean;

  @Column('int')
  offerId: number;

  @ManyToOne(() => Offer, (offer) => offer.applications, { onDelete: 'CASCADE' })
  offer: Offer;

  @ManyToOne(() => Student, (student) => student.applications)
  student: Student;
}