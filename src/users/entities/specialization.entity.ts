import { StudyForm } from "src/lib/enums/study-form.enum";
import { Domain } from "./domain.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, VirtualColumn } from "typeorm";

@Entity()
export class Specialization {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  studyYears: number;

  @Column({ type: "enum", enum: StudyForm })
  studyForm: StudyForm;

  @ManyToOne(() => Domain, (domain) => domain.specializations, { onDelete: 'CASCADE' })
  domain: Domain;

  @VirtualColumn({
    query: (alias) => `
      SELECT COUNT(student.id)
      FROM user student
      WHERE student.specializationId = ${alias}.id
    `,
    select: false,
  })
  studentCount: number;
}