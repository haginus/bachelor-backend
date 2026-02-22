import { Submission } from "../../grading/entities/submission.entity";
import { LogName } from "../../lib/enums/log-name.enum";
import { LogSeverity } from "../../lib/enums/log-severity.enum";
import { DocumentReuploadRequest } from "../../papers/entities/document-reupload-request.entity";
import { Document } from "../../papers/entities/document.entity";
import { Paper } from "../../papers/entities/paper.entity";
import { UserExtraData } from "../../users/entities/user-extra-data.entity";
import { User } from "../../users/entities/user.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Log {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: LogName;

  @Column({ type: 'enum', enum: LogSeverity })
  severity: LogSeverity;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ type: 'json', nullable: true })
  meta: Record<string, any> | null;

  @Column('int', { nullable: true })
  byUserId: number | null;

  @Column('int', { nullable: true })
  impersonatedByUserId: number | null;

  @Column('int', { nullable: true })
  userId: number | null;

  @Column('int', { nullable: true })
  userExtraDataId: number | null;

  @Column('int', { nullable: true })
  submissionId: number | null;

  @Column('int', { nullable: true })
  paperId: number | null;

  @Column('int', { nullable: true })
  documentId: number | null;

  @Column('int', { nullable: true })
  documentReuploadRequestId: number | null;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'byUserId' })
  byUser: User | null;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'impersonatedByUserId' })
  impersonatedByUser: User | null;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @ManyToOne(() => UserExtraData, { nullable: true, eager: true })
  @JoinColumn({ name: 'userExtraDataId' })
  userExtraData: UserExtraData | null;

  @ManyToOne(() => Submission, { nullable: true, eager: true })
  @JoinColumn({ name: 'submissionId' })
  submission: Submission | null;

  @ManyToOne(() => Paper, { nullable: true, eager: true })
  @JoinColumn({ name: 'paperId' })
  paper: Paper | null;

  @ManyToOne(() => Document, { nullable: true, eager: true })
  @JoinColumn({ name: 'documentId' })
  document: Document | null;

  @ManyToOne(() => DocumentReuploadRequest, { nullable: true, eager: true })
  @JoinColumn({ name: 'documentReuploadRequestId' })
  documentReuploadRequest: DocumentReuploadRequest | null;

}