import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { User } from "./user.entity";
import { CivilState } from "../../lib/enums/civil-state.enum";
import { Address } from "./address.entity";

@Entity()
export class UserExtraData {

  @PrimaryColumn()
  userId: number;

  @OneToOne(() => User, (user) => user.extraData, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  birthLastName: string;

  @Column()
  parentInitial: string;

  @Column()
  fatherName: string;

  @Column()
  motherName: string;

  @Column({ type: 'enum', enum: CivilState })
  civilState: CivilState;

  @Column({ type: 'date' })
  dateOfBirth: Date;

  @Column()
  citizenship: string;

  @Column()
  ethnicity: string;

  @Column()
  placeOfBirthCountry: string;

  @Column()
  placeOfBirthCounty: string;

  @Column()
  placeOfBirthLocality: string;

  @Column()
  landline: string;

  @Column()
  mobilePhone: string;

  @Column()
  personalEmail: string;

  @OneToOne(() => Address, { cascade: true, eager: true })
  @JoinColumn()
  address: Address;

}