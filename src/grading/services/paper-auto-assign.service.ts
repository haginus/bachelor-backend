import { Injectable } from "@nestjs/common";
import { DataSource, Equal, In, IsNull, Not, Or } from "typeorm";
import { Committee } from "../entities/committee.entity";
import { Paper } from "src/papers/entities/paper.entity";
import { ImportResult } from "src/lib/interfaces/import-result.interface";

@Injectable()
export class PaperAutoAssignService {
  
  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async autoAssignPapers(): Promise<ImportResult<Paper, Paper>> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const committees = await queryRunner.manager.find(Committee, {
        relations: {
          papers: true,
          domains: true,
          members: {
            teacher: {
              offers: { topics: true },
              papers: { topics: true },
            }
          }
        }
      });
      const committeeWrappers = committees.map(committee => {
        const topicIds = new Set<number>();
        committee.members.forEach(member => {
          member.teacher.offers.forEach(offer => {
            offer.topics.forEach(topic => topicIds.add(topic.id));
          });
          member.teacher.papers.forEach(paper => {
            paper.topics.forEach(topic => topicIds.add(topic.id));
          });
        });
        return {
          id: committee.id,
          committee,
          topicIds,
          addedPaperIds: [] as number[],
          totalPaperCount: committee.papers.length,
        };
      });
      const papers = await queryRunner.manager.find(Paper, {
        where: {
          submissionId: Not(IsNull()),
          committeeId: IsNull(),
          isValid: Or(IsNull(), Equal(true)),
          type: In(['bachelor', 'diploma']),
        },
        relations: {
          topics: true,
          teacher: true,
          student: {
            specialization: { domain: true }
          }
        }
      });
      let importResult: ImportResult<Paper, Paper> = {
        summary: {
          proccessed: papers.length,
          created: 0,
          updated: 0,
          failed: 0,
        },
        rows: []
      };
      for(let idx = 0; idx < papers.length; idx++) {
        const paper = papers[idx];
        const paperTopicIds = paper.topics.map(topic => topic.id);
        const compatibleCommittees = committeeWrappers.filter(wrapper => {
          const teacherInCommittee = wrapper.committee.members.some(member => member.teacher.id === paper.teacher.id);
          const domainCompatible = wrapper.committee.domains.some(domain => domain.id === paper.student.specialization.domain.id);
          const topicCompatible = paperTopicIds.some(topicId => wrapper.topicIds.has(topicId));
          return !teacherInCommittee && domainCompatible && topicCompatible;
        });
        if(compatibleCommittees.length == 0) {
          importResult.summary.failed++;
          importResult.rows.push({
            rowIndex: idx,
            result: 'failed',
            row: paper,
            data: null,
            error: 'Nu a fost găsită nicio comisie compatibilă pentru această lucrare.'
          });
        } else {
          const minPaperCount = Math.min(...compatibleCommittees.map(wrapper => wrapper.totalPaperCount));
          const leastBusyCommittee = compatibleCommittees.find(wrapper => wrapper.totalPaperCount === minPaperCount)!;
          paper.committeeId = leastBusyCommittee.id;
          paper.committee = leastBusyCommittee.committee;
          leastBusyCommittee.addedPaperIds.push(paper.id);
          leastBusyCommittee.totalPaperCount++;
          importResult.summary.updated!++;
          importResult.rows.push({
            rowIndex: idx,
            result: 'updated',
            row: paper,
            data: paper,
          });
        }
      }
      for(const wrapper of committeeWrappers.filter(wrapper => wrapper.addedPaperIds.length > 0)) {
        await queryRunner.manager.update(Paper, { id: In(wrapper.addedPaperIds) }, { committeeId: wrapper.id });
      }
      await queryRunner.commitTransaction();
      return importResult;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}