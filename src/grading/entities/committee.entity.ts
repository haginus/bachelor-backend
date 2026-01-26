import { Column, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { CommitteeMember } from "./committee-member.entity";
import { CommitteeActivityDay } from "./committee-activity-day.entity";
import { Paper } from "src/papers/entities/paper.entity";
import { Domain } from "src/users/entities/domain.entity";

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

  @ManyToMany(() => Domain, { cascade: true })
  @JoinTable({ name: 'committee_domains' })
  domains: Domain[];

  @OneToMany(() => CommitteeMember, member => member.committee, { cascade: true })
  members: CommitteeMember[];

  @OneToMany(() => CommitteeActivityDay, activityDay => activityDay.committee, { cascade: true })
  activityDays: CommitteeActivityDay[];

  @OneToMany(() => Paper, paper => paper.committee, { cascade: true })
  papers: Paper[];
}