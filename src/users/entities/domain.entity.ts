import { DomainType } from "src/lib/enums/domain-type.enum";
import { PaperType } from "src/lib/enums/paper-type.enum";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn, VirtualColumn } from "typeorm";
import { Specialization } from "./specialization.entity";

@Entity()
export class Domain {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: "enum", enum: DomainType })
  type: DomainType;

  @Column({ type: "enum", enum: PaperType })
  paperType: PaperType;

  @OneToMany(() => Specialization, (specialization) => specialization.domain, { cascade: true })
  specializations: Specialization[];

  @VirtualColumn({
    query: (alias) => `
      SELECT COUNT(student.id)
      FROM user student, specialization
      WHERE student.specializationId = specialization.id AND specialization.domainId = ${alias}.id
    `,
    select: false,
  })
  studentCount: number;
}