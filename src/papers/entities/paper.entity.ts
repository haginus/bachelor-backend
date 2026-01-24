import { Topic } from "src/common/entities/topic.entity";
import { PaperType } from "src/lib/enums/paper-type.enum";
import { Student, Teacher } from "src/users/entities/user.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Document } from "./document.entity";

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

  @Column({ nullable: true })
  isValid: boolean;

  // @Column({ nullable: true })
  // submitted: boolean;

  @Column({ nullable: true })
  scheduledGrading: Date;

  @Column('int')
  studentId: number;

  @Column('int', { nullable: true })
  teacherId: number;

  @ManyToMany(() => Topic, { cascade: true, onDelete: 'CASCADE' })
  @JoinTable({ name: 'paper_topics' })
  topics: Topic[];

  @OneToOne(() => Student, (student) => student.paper, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @ManyToOne(() => Teacher, (teacher) => teacher.papers, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  @OneToMany(() => Document, (document) => document.paper)
  documents: Document[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}