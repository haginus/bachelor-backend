import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Topic } from "../entities/topic.entity";
import { In, Repository } from "typeorm";
import { TopicDto } from "../dto/topic.dto";
import { TopicQueryDto } from "../dto/topic-query.dto";

@Injectable()
export class TopicsService {

  constructor(
    @InjectRepository(Topic) private readonly topicsRepository: Repository<Topic>,
  ) {}

  async findAll(query: TopicQueryDto): Promise<Topic[]> {
    return this.topicsRepository.find({
      order: {
        [query.sortBy]: query.sortDirection,
      }
    });
  }

  async findByIds(ids: number[]): Promise<Topic[]> {
    return this.topicsRepository.findBy({ id: In(ids) });
  }

  async findOne(id: number): Promise<Topic> {
    const topic = await this.topicsRepository.findOneBy({ id });
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

  async delete(id: number): Promise<void> {
    // TODO: Check for relations before deleting
    const topic = await this.findOne(id);
    await this.topicsRepository.remove(topic);
  }

  async bulkDelete(ids: number[]): Promise<void> {
    const topics = await this.findByIds(ids);
    await this.topicsRepository.remove(topics);
  }

}