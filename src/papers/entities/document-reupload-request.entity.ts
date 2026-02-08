import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Paper } from "./paper.entity";
import { inclusiveDate } from "../../lib/utils";

@Entity()
export class DocumentReuploadRequest {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  documentName: string;

  @Column({ type: 'varchar', nullable: true })
  comment: string | null;

  @Column()
  deadline: Date;

  @Column('int')
  paperId: number;

  @ManyToOne(() => Paper, (paper) => paper.documentReuploadRequests, { onDelete: 'CASCADE' })
  paper: Paper;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  isActive(): boolean {
    return !this.deletedAt && inclusiveDate(this.deadline).getTime() >= Date.now();
  }

}