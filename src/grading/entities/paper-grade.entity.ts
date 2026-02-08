import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { CommitteeMember } from "./committee-member.entity";
import { Paper } from "../../papers/entities/paper.entity";
import { Exclude } from "class-transformer";

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

  @Exclude()
  @ManyToOne(() => Paper, paper => paper.grades, { onDelete: 'CASCADE' })
  paper: Paper;
}