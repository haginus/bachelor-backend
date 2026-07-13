import { Injectable } from "@nestjs/common";
import { DataSource, Equal, In, IsNull, Or } from "typeorm";
import { Committee } from "../entities/committee.entity";
import { Paper } from "../../papers/entities/paper.entity";
import { ImportResponse } from "../../lib/interfaces/import-response.interface";
import { ImportJobsService } from "../../common/services/import-jobs.service";

@Injectable()
export class PaperAutoAssignService {
  
  constructor(
    private readonly dataSource: DataSource,
    private readonly importJobsService: ImportJobsService,
  ) {}

  async autoAssignPapers(): Promise<ImportResponse<Paper, Paper>> {
    const committees = await this.dataSource.manager.find(Committee, {
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
    const papers = await this.dataSource.manager.find(Paper, {
      where: {
        student: {
          submission: { isSubmitted: true },
        },
        committeeId: IsNull(),
        isValid: Or(IsNull(), Equal(true)),
        type: In(['bachelor', 'diploma']),
      },
      relations: {
        topics: true,
        teacher: true,
        student: {
          specialization: { domain: true },
          submission: true,
        }
      }
    });
    const importJob = this.importJobsService.createJob(papers, async (paper) => {
      const paperTopicIds = paper.topics.map(topic => topic.id);
      const compatibleCommittees = committeeWrappers.filter(wrapper => {
        const teacherInCommittee = wrapper.committee.members.some(member => member.teacher.id === paper.teacher.id);
        const domainCompatible = wrapper.committee.domains.some(domain => domain.id === paper.student.specialization.domain.id);
        const topicCompatible = paperTopicIds.some(topicId => wrapper.topicIds.has(topicId));
        return !teacherInCommittee && domainCompatible && topicCompatible;
      });
      if(compatibleCommittees.length == 0) {
        throw new Error(`Nu a fost găsită nicio comisie compatibilă pentru această lucrare.`);
      }
      const minPaperCount = Math.min(...compatibleCommittees.map(wrapper => wrapper.totalPaperCount));
      const leastBusyCommittee = compatibleCommittees.find(wrapper => wrapper.totalPaperCount === minPaperCount)!;
      paper.committeeId = leastBusyCommittee.id;
      paper.committee = leastBusyCommittee.committee;
      leastBusyCommittee.addedPaperIds.push(paper.id);
      leastBusyCommittee.totalPaperCount++;
      await this.dataSource.manager.update(Paper, { id: paper.id }, { committeeId: leastBusyCommittee.id });
      return { result: 'updated', data: paper };
    });
    return importJob.getStatus();
  }
}