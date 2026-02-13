import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Topic } from "../entities/topic.entity";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { TopicDto } from "../dto/topic.dto";
import { TopicQueryDto } from "../dto/topic-query.dto";

@Injectable()
export class TopicsService {

  constructor(
    @InjectRepository(Topic) private readonly topicsRepository: Repository<Topic>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: TopicQueryDto): Promise<Topic[]> {
    if((query.sortBy === 'offerCount' || query.sortBy === 'paperCount' || query.sortBy === 'studentCount') && !query.detailed) {
      throw new BadRequestException(`Sortarea după '${query.sortBy}' necesită detalierea răspunsului.`);
    }
    return this.topicsRepository.find({
      select: query.detailed ? ['id', 'name', 'offerCount', 'paperCount', 'studentCount'] : ['id', 'name'],
      order: {
        [query.sortBy]: query.sortDirection,
      }
    });
  }

  async findByIds(ids: number[], detailed?: boolean): Promise<Topic[]> {
    const topics = await this.topicsRepository.find({
      where: { id: In(ids) },
      select: detailed ? ['id', 'name', 'offerCount', 'paperCount', 'studentCount'] : ['id', 'name'],
    });
    if(topics.length !== ids.length) {
      throw new NotFoundException('Una sau mai multe teme nu au fost găsite.');
    }
    return topics;
  }

  async findOne(id: number): Promise<Topic> {
    const topic = await this.topicsRepository.findOne({ 
      where: { id },
      select: ['id', 'name', 'offerCount', 'paperCount', 'studentCount'],
    });
    if(!topic) {
      throw new NotFoundException();
    }
    return topic;
  }

  async create(dto: TopicDto): Promise<Topic> {
    const existingTopic = await this.topicsRepository.findOneBy({ name: dto.name });
    if(existingTopic) {
      throw new ConflictException(`Tema cu numele '${dto.name}' există deja.`);
    }
    const topic = this.topicsRepository.create(dto);
    return this.topicsRepository.save(topic);
  }

  async bulkCreate(dtos: TopicDto[]): Promise<Topic[]> {
    const names = dtos.map(dto => dto.name);
    const existingTopics = await this.topicsRepository.findBy({ name: In(names) });
    if(existingTopics.length > 0) {
      const existingNames = existingTopics.map(t => t.name).join(', ');
      throw new ConflictException(`Următoarele teme există deja: ${existingNames}.`);
    }
    const topics = this.topicsRepository.create(dtos);
    return this.topicsRepository.save(topics);
  }

  async update(id: number, dto: TopicDto): Promise<Topic> {
    const topic = await this.findOne(id);
    if(dto.name && dto.name !== topic.name) {
      const existingTopic = await this.topicsRepository.findOneBy({ name: dto.name });
      if(existingTopic) {
        throw new ConflictException(`Tema cu numele '${dto.name}' există deja.`);
      }
      topic.name = dto.name;
    }
    return this.topicsRepository.save(topic);
  }

  async delete(id: number, moveToId?: number): Promise<void> {
    const topic = await this.findOne(id);
    const relationsCount = topic.offerCount + topic.paperCount + topic.studentCount;
    if(relationsCount > 0 && !moveToId) {
      throw new BadRequestException(`Tema '${topic.name}' are studenți/oferte/lucrări asociate. Specificați o temă de mutare.`);
    }
    if(moveToId === id) {
      throw new BadRequestException(`Tema de mutare nu poate fi aceeași cu tema ștersă.`);
    }
    await this.dataSource.transaction(async manager => {
      if(relationsCount > 0) {
        await this.findOne(moveToId!).catch(() => {
          throw new NotFoundException(`Tema de mutare cu id '${moveToId}' nu a fost găsită.`);
        });
        await this.moveTopicRelations([id], moveToId!, manager);
      }
      await manager.remove(topic);
    });
  }

  async bulkDelete(ids: number[], moveToId?: number): Promise<void> {
    const topics = await this.findByIds(ids, true);
    const totalRelations = topics.reduce((sum, t) => sum + t.offerCount + t.paperCount + t.studentCount, 0);
    if(totalRelations > 0 && !moveToId) {
      throw new BadRequestException(`Una sau mai multe teme au studenți/oferte/lucrări asociate. Specificați o temă de mutare.`);
    }
    if(moveToId && ids.includes(moveToId)) {
      throw new BadRequestException(`Tema de mutare nu poate fi aceeași cu temele șterse.`);
    }
    await this.dataSource.transaction(async manager => {
      if(totalRelations > 0) {
        await this.findOne(moveToId!).catch(() => {
          throw new NotFoundException(`Tema de mutare cu id '${moveToId}' nu a fost găsită.`);
        });
        await this.moveTopicRelations(ids, moveToId!, manager);
      }
      await manager.remove(topics);
    });
  }

  private async moveTopicRelations(oldTopicIds: number[], moveToId: number, manager: EntityManager) {
    const tables = [['offer_topics', 'offerId'], ['paper_topics', 'paperId'], ['student_topics', 'userId']];
    for(const [table, column] of tables) {
      const excludedIds = await manager.createQueryBuilder()
        .select(column, 'id')
        .from(table, table)
        .where('topicId = :topicId', { topicId: moveToId })
        .getRawMany<{ id: number; }>();
      const qb = manager.createQueryBuilder()
        .update(table)
        .set({ topicId: moveToId })
        .where('topicId IN (:...oldTopicIds)', { oldTopicIds });
      if(excludedIds.length > 0) {
        qb.andWhere(`${column} NOT IN (:...excludedIds)`, { excludedIds: excludedIds.map(e => e.id) });
      }
      await qb.execute();
    }
  }

}