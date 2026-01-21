import { DomainType } from "src/lib/enums/domain-type.enum";
import { PaperType } from "src/lib/enums/paper-type.enum";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
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

  @OneToMany(() => Specialization, (specialization) => specialization.domain)
  specializations: Specialization[];
}