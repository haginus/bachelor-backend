import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
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

  @OneToOne(() => Student, (student) => student.submission, { onDelete: 'CASCADE', orphanedRowAction: 'delete' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Expose({ groups: ['writtenExamGradesPublic', 'logs'] })
  @OneToOne(() => WrittenExamGrade, grade => grade.submission)
  writtenExamGrade: WrittenExamGrade;

}