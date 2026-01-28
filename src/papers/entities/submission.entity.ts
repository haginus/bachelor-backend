import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Paper } from "./paper.entity";

@Entity()
export class Submission {
  
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  submittedAt: Date;

  @OneToOne(() => Paper, (paper) => paper.submission, { onDelete: 'CASCADE', orphanedRowAction: 'delete' })
  paper: Paper;
}