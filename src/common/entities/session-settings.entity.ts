import { Exclude } from "class-transformer";
import { isDateInInclusiveRange } from "../../lib/utils";
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class SessionSettings {

  @Exclude()
  @PrimaryColumn({ default: 1 })
  id: number;

  @Column()
  sessionName: string;

  @Column()
  currentPromotion: string;

  @Column()
  applyStartDate: Date;

  @Column()
  applyEndDate: Date;

  @Column()
  fileSubmissionStartDate: Date;

  @Column()
  fileSubmissionEndDate: Date;

  @Column()
  paperSubmissionEndDate: Date;

  @Column()
  allowPaperGrading: boolean;

  @Column({ type: 'datetime', nullable: true })
  writtenExamDate: Date | null;

  @Column({ type: 'datetime', nullable: true })
  writtenExamDisputeEndDate: Date | null;

  @Column({ default: false })
  writtenExamGradesPublic: boolean;

  @Column({ default: false })
  writtenExamDisputedGradesPublic: boolean;

  canApply() {
    return isDateInInclusiveRange(new Date(), this.applyStartDate, this.applyEndDate);
  }

  canUploadSecretaryFiles() {
    return isDateInInclusiveRange(new Date(), this.fileSubmissionStartDate, this.fileSubmissionEndDate);
  }

  canUploadPaperFiles() {
    return isDateInInclusiveRange(new Date(), this.fileSubmissionStartDate, this.paperSubmissionEndDate);
  }
}