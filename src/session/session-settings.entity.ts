import { Exclude } from "class-transformer";
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
}