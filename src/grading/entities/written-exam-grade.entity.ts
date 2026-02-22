import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { Submission } from "./submission.entity";
import { Expose } from "class-transformer";

@Entity()
export class WrittenExamGrade {

  @PrimaryColumn()
  submissionId: number;

  @OneToOne(() => Submission, submission => submission.writtenExamGrade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submissionId' })
  submission: Submission;

  @Expose({ groups: ['writtenExamGradesPublic', 'logs'] })
  @Column('int')
  initialGrade: number;

  @Column({ default: false })
  isDisputed: boolean;

  @Expose({ groups: ['writtenExamDisputedGradesPublic', 'logs'] })
  @Column('int', { nullable: true })
  disputeGrade: number;

  @Expose({ groups: ['writtenExamDisputedGradesPublic', 'logs'] })
  get finalGrade(): number {
    return Math.max(this.initialGrade, this.disputeGrade || 0);
  }
  
}