import { CommitteeMemberRole } from "src/lib/enums/committee-member-role.enum";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { Committee } from "./committee.entity";
import { Teacher } from "src/users/entities/user.entity";
import { PaperGrade } from "./paper-grade.entity";

@Entity()
export class CommitteeMember {
  
  @PrimaryColumn()
  committeeId: number;

  @PrimaryColumn()
  teacherId: number;

  @Column({ type: 'enum', enum: CommitteeMemberRole })
  role: CommitteeMemberRole;

  @ManyToOne(() => Committee, committee => committee.members, { onDelete: 'CASCADE' })
  committee: Committee;

  @ManyToOne(() => Teacher, teacher => teacher.committeeMemberships)
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  @OneToMany(() => PaperGrade, paperGrade => paperGrade.committeeMember)
  paperGrades: PaperGrade[];
}