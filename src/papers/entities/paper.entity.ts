import { Topic } from "src/common/entities/topic.entity";
import { PaperType } from "src/lib/enums/paper-type.enum";
import { Student, Teacher } from "src/users/entities/user.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Document } from "./document.entity";
import { RequiredDocumentDto } from "src/lib/dto/required-document.dto";
import { Expose, plainToInstance } from "class-transformer";
import { PaperGrade } from "src/grading/entities/paper-grade.entity";
import { Committee } from "src/grading/entities/committee.entity";
import { Submission } from "./submission.entity";
import { groupBy } from "src/lib/utils";

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
  @Index()
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

  @ManyToMany(() => Topic, { onDelete: 'CASCADE' })
  @JoinTable({ name: 'paper_topics' })
  topics: Topic[];

  // We disable foreign key constraints here because papers can be soft-deleted, so a student
  // with a deleted paper should still be able to have a new paper.
  @OneToOne(() => Student, (student) => student.paper, { onDelete: 'CASCADE', createForeignKeyConstraints: false })
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

  @Expose()
  get gradeAverage(): number | undefined {
    if(!this.grades) {
      return undefined;
    }
    const sum = this.grades.reduce((acc, { forPaper, forPresentation }) => acc + (forPaper + forPresentation) / 2, 0);
    return this.grades.length > 0 ? sum / this.grades.length : undefined;
  }

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

  getMissingRequiredDocuments(): RequiredDocumentDto[] {
    const documentsByName = groupBy(this.documents, document => document.name);
    const requiredDocuments = this.requiredDocuments.map(requiredDocument => {
      const documents = documentsByName[requiredDocument.name] || [];
      const actualTypes = Object.fromEntries(Object.keys(requiredDocument.types).map(type => (
        [type, documents.some(doc => doc.type == type)]
      )));
      return {
        ...requiredDocument,
        actualTypes,
      };
    });
    return requiredDocuments
      .filter(requiredDocument => {
        return !Object.keys(requiredDocument.types).every(key => requiredDocument.actualTypes[key] == true);
      })
      .map(requiredDocument => plainToInstance(RequiredDocumentDto, requiredDocument, { excludeExtraneousValues: true }));
  }
}