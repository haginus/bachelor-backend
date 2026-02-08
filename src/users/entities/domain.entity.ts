import { DomainType } from "../../lib/enums/domain-type.enum";
import { PaperType } from "../../lib/enums/paper-type.enum";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn, VirtualColumn } from "typeorm";
import { Specialization } from "./specialization.entity";
import { Offer } from "../../offers/entities/offer.entity";

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

  @OneToMany(() => Offer, (offer) => offer.domain)
  offers: Offer[];

  @VirtualColumn({
    query: (alias) => `
      SELECT COUNT(student.id)
      FROM user student, specialization
      WHERE student.specializationId = specialization.id AND specialization.domainId = ${alias}.id
    `,
    select: false,
  })
  studentCount: number;

  @VirtualColumn({
    query: (alias) => `
      SELECT COUNT(offer.id)
      FROM offer
      WHERE offer.domainId = ${alias}.id
    `,
    select: false,
  })
  offerCount: number;
}