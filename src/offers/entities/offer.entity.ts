import { Topic } from "src/common/entities/topic.entity";
import { Domain } from "src/users/entities/domain.entity";
import { Teacher } from "src/users/entities/user.entity";
import { Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, VirtualColumn } from "typeorm";
import { Application } from "./application.entity";

@Entity()
export class Offer {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  description: string;

  @Column('int')
  limit: number;

  @Column({ type: 'int', default: 0 })
  takenSeats: number;

  get availableSeats(): number {
    return this.limit - this.takenSeats;
  }

  @ManyToOne(() => Teacher, (teacher) => teacher.offers)
  teacher: Teacher;

  @ManyToOne(() => Domain, (domain) => domain.offers, { onDelete: 'CASCADE' })
  domain: Domain;

  @ManyToMany(() => Topic, { cascade: true, onDelete: 'CASCADE' })
  @JoinTable({ name: 'offer_topics' })
  topics: Topic[];

  @OneToMany(() => Application, (application) => application.offer)
  applications: Application[];

  @VirtualColumn({
    query: (alias) => `
      SELECT COUNT(application.id)
      FROM application
      WHERE application.offerId = ${alias}.id AND application.accepted IS NULL
    `,
    select: false,
  })
  pendingApplicationCount: number;

}