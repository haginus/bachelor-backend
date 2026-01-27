import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Paper } from "./paper.entity";
import { User } from "src/users/entities/user.entity";
import { DocumentType } from "src/lib/enums/document-type.enum";
import { DocumentCategory } from "src/lib/enums/document-category.enum";

@Entity()
export class Document {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('varchar')
  category: DocumentCategory;

  @Column({ type: 'enum', enum: DocumentType })
  type: DocumentType;

  @Column()
  mimeType: string;

  @Column('simple-json')
  meta: Record<string, any>;

  @Column('int', { nullable: true })
  uploadedById: number | null;

  @Column('int')
  paperId: number;

  @ManyToOne(() => Paper, (paper) => paper.documents, { onDelete: 'CASCADE' })
  paper: Paper;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

}