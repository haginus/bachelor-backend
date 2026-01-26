import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { CommitteeMember } from "./committee-member.entity";
import { Paper } from "src/papers/entities/paper.entity";

@Entity()
export class PaperGrade {
  
  @PrimaryColumn()
  committeeMemberCommitteeId: number;

  @PrimaryColumn()
  committeeMemberTeacherId: number;

  @PrimaryColumn()
  paperId: number;

  @Column('int')
  forPaper: number;

  @Column('int')
  forPresentation: number;

  @ManyToOne(() => CommitteeMember, member => member.paperGrades, { onDelete: 'CASCADE' })
  committeeMember: CommitteeMember;

  @ManyToOne(() => Paper, paper => paper.grades, { onDelete: 'CASCADE' })
  paper: Paper;
}