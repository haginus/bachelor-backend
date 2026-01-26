import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { CommitteeMember } from "./committee-member.entity";
import { CommitteeActivityDay } from "./committee-activity-day.entity";
import { Paper } from "src/papers/entities/paper.entity";

@Entity()
export class Committee {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'int', default: 15 })
  paperPresentationTime: number;

  @Column({ default: false })
  publicScheduling: boolean;

  @Column({ default: false })
  finalGrades: boolean;

  @OneToMany(() => CommitteeMember, member => member.committee, { cascade: true, orphanedRowAction: 'delete' })
  members: CommitteeMember[];

  @OneToMany(() => CommitteeActivityDay, activityDay => activityDay.committee, { cascade: true, orphanedRowAction: 'delete' })
  activityDays: CommitteeActivityDay[];

  @OneToMany(() => Paper, paper => paper.committee)
  papers: Paper[];
}