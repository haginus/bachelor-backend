import { StudyForm } from "../../lib/enums/study-form.enum";
import { Domain } from "./domain.entity";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, VirtualColumn } from "typeorm";
import { Secretary } from "./user.entity";
import { Expose } from "class-transformer";

@Entity()
export class Specialization {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  catalogName: string | null;

  @Column()
  studyYears: number;

  @Column({ type: "enum", enum: StudyForm })
  studyForm: StudyForm;

  @ManyToOne(() => Domain, (domain) => domain.specializations, { onDelete: 'CASCADE' })
  domain: Domain;

  @ManyToOne(() => Secretary, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'secretaryId' })
  secretary: Secretary | null;

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