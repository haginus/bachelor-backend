import { FundingForm } from "../../lib/enums/funding-form.enum";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Specialization } from "./specialization.entity";

@Entity()
export class SignUpRequest {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'varchar', nullable: true })
  CNP: string | null;

  @Column()
  email: string;

  @Column()
  identificationCode: string;

  @Column()
  matriculationYear: string;

  @Column()
  promotion: string;

  @Column()
  group: string;

  @Column({ type: 'enum', enum: FundingForm })
  fundingForm: FundingForm;

  @ManyToOne(() => Specialization, { nullable: true, onDelete: 'SET NULL' })
  specialization: Specialization | null;

  @CreateDateColumn()
  createdAt: Date;
}