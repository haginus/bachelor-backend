import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Committee } from "./committee.entity";

@Entity()
export class CommitteeActivityDay {
  
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  location: string;

  @Column()
  startTime: Date;

  @ManyToOne(() => Committee, (committee) => committee.activityDays, { onDelete: 'CASCADE' })
  committee: Committee;
}