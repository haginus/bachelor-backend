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
  allowGrading: boolean;

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