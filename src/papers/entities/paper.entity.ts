import { Topic } from "src/common/entities/topic.entity";
import { PaperType } from "src/lib/enums/paper-type.enum";
import { Student, Teacher } from "src/users/entities/user.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Document } from "./document.entity";
import { RequiredDocumentDto } from "src/lib/dto/required-document.dto";
import { instanceToPlain, plainToInstance, Transform, Type } from "class-transformer";
import { PaperGrade } from "src/grading/entities/paper-grade.entity";
import { Committee } from "src/grading/entities/committee.entity";
import { Submission } from "./submission.entity";

@Entity()
export class Paper {
  
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'varchar', length: 1024 })
  description: string;

  @Column({ type: 'enum', enum: PaperType })
  type: PaperType;

  @Column({ type: 'boolean', nullable: true })
  isValid: boolean | null;

  @Column({ type: 'datetime', nullable: true })
  scheduledGrading: Date | null;

  @Column('int')
  studentId: number;

  @Column('int', { nullable: true })
  teacherId: number;

  @Column('int', { nullable: true })
  committeeId: number;

  @Column('int', { nullable: true })
  submissionId: number;

  @OneToOne(() => Submission, (submission) => submission.paper, { cascade: true, nullable: true })
  @JoinColumn({ name: 'submissionId' })
  submission: Submission | null;

  @ManyToMany(() => Topic, { cascade: true, onDelete: 'CASCADE' })
  @JoinTable({ name: 'paper_topics' })
  topics: Topic[];

  @OneToOne(() => Student, (student) => student.paper, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @ManyToOne(() => Teacher, (teacher) => teacher.papers, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  @ManyToOne(() => Committee, committee => committee.papers, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'committeeId' })
  committee: Committee | null;

  @OneToMany(() => Document, (document) => document.paper)
  documents: Document[];

  @OneToMany(() => PaperGrade, paperGrade => paperGrade.paper)
  grades: PaperGrade[];

  @Column({ 
    type: 'simple-json', 
    transformer: {
      to: (value: RequiredDocumentDto[]) => value,
      from: (value: any) => plainToInstance(RequiredDocumentDto, value, { excludeExtraneousValues: true }),
    },
  })
  requiredDocuments: RequiredDocumentDto[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}