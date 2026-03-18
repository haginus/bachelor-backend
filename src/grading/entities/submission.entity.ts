import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Student } from "../../users/entities/user.entity";
import { WrittenExamGrade } from "./written-exam-grade.entity";
import { Expose } from "class-transformer";

@Entity()
export class Submission {
  
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  isSubmitted: boolean;

  @Column({ nullable: true })
  submittedAt: Date;

  // This is actually a OneToOne relation, but because of soft delete, we need to allow multiple submissions to be linked to the same student
  @ManyToOne(() => Student, (student) => student.submission, { onDelete: 'CASCADE', orphanedRowAction: 'soft-delete' })
  @JoinColumn({ name: 'studentId' })
  @Index()
  student: Student;

  @Expose({ groups: ['writtenExamGradesPublic', 'logs'] })
  @OneToOne(() => WrittenExamGrade, grade => grade.submission)
  writtenExamGrade: WrittenExamGrade;

  @DeleteDateColumn()
  deletedAt: Date | null;

}