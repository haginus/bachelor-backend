import { Column, Entity, PrimaryGeneratedColumn, VirtualColumn } from "typeorm";

@Entity()
export class Topic {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @VirtualColumn({
    query: (alias) => `
      SELECT COUNT(ot.offerId)
      FROM offer_topics ot
      WHERE ot.topicId = ${alias}.id
    `,
    select: false,
  })
  offerCount: number;

  @VirtualColumn({
    query: (alias) => `
      SELECT COUNT(pt.paperId)
      FROM paper_topics pt
      WHERE pt.topicId = ${alias}.id
    `,
    select: false,
  })
  paperCount: number;

  @VirtualColumn({
    query: (alias) => `
      SELECT COUNT(st.userId)
      FROM student_topics st
      WHERE st.topicId = ${alias}.id
    `,
    select: false,
  })
  studentCount: number;

}