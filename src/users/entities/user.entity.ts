import { Exclude, Expose } from "class-transformer";
import { FundingForm } from "src/lib/enums/funding-form.enum";
import { UserType } from "src/lib/enums/user-type.enum";
import { ChildEntity, Column, CreateDateColumn, DeleteDateColumn, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, TableInheritance, UpdateDateColumn, VirtualColumn } from "typeorm";
import { Specialization } from "./specialization.entity";
import { Profile } from "./profile.entity";
import { Topic } from "src/common/entities/topic.entity";
import { Offer } from "src/offers/entities/offer.entity";
import { Application } from "src/offers/entities/application.entity";
import { Paper } from "src/papers/entities/paper.entity";
import { UserExtraData } from "./user-extra-data.entity";
import { CommitteeMember } from "src/grading/entities/committee-member.entity";

@Entity()
@TableInheritance({ column: { type: 'varchar', name: "type" } })
export class User {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: UserType;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  title: string;

  @Expose()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @Column()
  email: string;

  @Exclude()
  @Column({ nullable: true })
  password: string;

  @Expose({ groups: ['full'] })
  @Column({ nullable: true })
  CNP: string;

  @Expose({ groups: ['full'] })
  @Column({ default: false })
  validated: boolean;

  @OneToOne(() => Profile, (profile) => profile.user, { cascade: true, eager: true, nullable: true })
  profile: Profile;

  // For students
  @ManyToOne(() => Specialization, { nullable: true })
  specialization: Specialization;

  @OneToOne(() => UserExtraData, (extraData) => extraData.user, { cascade: true, nullable: true })
  extraData: UserExtraData;

  @Expose({ groups: ['full'] })
  @CreateDateColumn()
  createdAt: Date;

  @Expose({ groups: ['full'] })
  @UpdateDateColumn()
  updatedAt: Date;

  @Expose({ groups: ['full'] })
  @DeleteDateColumn()
  deletedAt!: Date | null;

  isImpersonated?: boolean;
}

@ChildEntity(UserType.Admin)
export class Admin extends User {
  override type = UserType.Admin;
}

@ChildEntity(UserType.Secretary)
export class Secretary extends User {
  override type = UserType.Secretary;
}

@ChildEntity(UserType.Student)
export class Student extends User {

  override type = UserType.Student;

  @Column()
  group: string;

  @Column()
  promotion: string;

  @Expose({ groups: ['full'] })
  @Column()
  identificationCode: string;

  @Expose({ groups: ['full'] })
  @Column()
  matriculationYear: string;

  @Expose({ groups: ['full'] })
  @Column({ type: 'enum', enum: FundingForm })
  fundingForm: FundingForm;

  @Expose({ groups: ['full'] })
  @Column({ type: 'float', nullable: true })
  generalAverage: number | null;

  @ManyToMany(() => Topic)
  @JoinTable({ name: 'student_topics' })
  topics: Topic[];

  @OneToMany(() => Application, (application) => application.student)
  applications: Application[];

  @OneToOne(() => Paper, (paper) => paper.student, { nullable: true })
  paper: Paper;

}

@ChildEntity(UserType.Teacher)
export class Teacher extends User {
  override type = UserType.Teacher;

  @OneToMany(() => Offer, (offer) => offer.teacher)
  offers: Offer[];

  @OneToMany(() => Paper, (paper) => paper.teacher)
  papers: Paper[];

  @OneToMany(() => CommitteeMember, member => member.teacher)
  committeeMemberships: CommitteeMember[];

  @VirtualColumn({
    query: (alias) => `
      SELECT COUNT(offer.id)
      FROM offer
      WHERE offer.teacherId = ${alias}.id
    `,
    select: false,
  })
  offerCount: number;

  @VirtualColumn({
    query: (alias) => `
      SELECT COUNT(paper.id)
      FROM paper
      WHERE paper.teacherId = ${alias}.id AND paper.deletedAt IS NULL
    `,
    select: false,
  })
  paperCount: number;

  @VirtualColumn({
    query: (alias) => `
      SELECT COUNT(paper.id)
      FROM paper
      WHERE paper.teacherId = ${alias}.id AND paper.submissionId IS NOT NULL AND paper.deletedAt IS NULL
    `,
    select: false,
  })
  submittedPaperCount: number;

  @VirtualColumn({
    query: (alias) => `
      SELECT COUNT(document.id)
      FROM document, paper
      WHERE 
        paper.teacherId = ${alias}.id AND 
        document.paperId = paper.id AND 
        document.name = 'plagiarism_report' AND
        paper.submissionId IS NOT NULL AND
        paper.deletedAt IS NULL AND
        document.deletedAt IS NULL
    `,
    select: false,
  })
  plagiarismReportCount: number;
}

export function isStudent(user: User): user is Student {
  return user.type === UserType.Student;
}
