import { Exclude, Expose } from "class-transformer";
import { FundingForm } from "src/lib/enums/funding-form.enum";
import { UserType } from "src/lib/enums/user-type.enum";
import { ChildEntity, Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn, TableInheritance, UpdateDateColumn } from "typeorm";
import { Specialization } from "./specialization.entity";
import { Profile } from "./profile.entity";

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

  @Column({ nullable: true })
  CNP: string;

  @Column()
  email: string;

  @Exclude()
  @Column({ nullable: true })
  password: string;

  @Column({ default: false })
  validated: boolean;

  @OneToOne(() => Profile, (profile) => profile.user, { cascade: true, eager: true, nullable: true })
  profile: Profile;

  // For students
  @ManyToOne(() => Specialization, { nullable: true })
  specialization: Specialization;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt!: Date | null;
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

  @Column()
  identificationCode: string;

  @Column()
  matriculationYear: number;

  @Column({ type: 'enum', enum: FundingForm })
  fundingForm: FundingForm;

  @Column()
  generalAverage: number;

}

@ChildEntity(UserType.Teacher)
export class Teacher extends User {
  override type = UserType.Teacher;
}
