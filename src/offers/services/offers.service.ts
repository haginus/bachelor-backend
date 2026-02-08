import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Offer } from "../entities/offer.entity";
import { Repository } from "typeorm";
import { TeachersService } from "../../users/services/teachers.service";
import { OfferDto } from "../dto/offer.dto";
import { DomainsService } from "../../users/services/domains.service";
import { TopicsService } from "../../common/services/topics.service";

@Injectable()
export class OffersService {
  
  constructor(
    @InjectRepository(Offer) private readonly offersRepository: Repository<Offer>,
    private readonly domainsService: DomainsService,
    private readonly teachersService: TeachersService,
    private readonly topicsService: TopicsService,
  ) {}

  private getQueryBuilder({ withTeacher = true, detailed = false }: { withTeacher?: boolean; detailed?: boolean } = {}) {
    let qb = this.offersRepository.createQueryBuilder('offer')
      .leftJoinAndSelect('offer.domain', 'domain')
      .leftJoinAndSelect('offer.topics', 'topic')
    if(withTeacher) {
      qb = qb.leftJoinAndSelect('offer.teacher', 'teacher').leftJoinAndSelect('teacher.profile', 'profile');
    }
    if(detailed) {
      qb.addSelect(['offer.pendingApplicationCount', 'offer.takenSeats']);
    }
    return qb;
  }

  async findAllByTeacher(teacherId: number): Promise<Offer[]> {
    return this.getQueryBuilder({ withTeacher: false, detailed: true })
      .where('offer.teacherId = :teacherId', { teacherId })
      .getMany();
  }

  async findOne(id: number, detailed = false): Promise<Offer> {
    const offer = await this.getQueryBuilder({ detailed })
      .where('offer.id = :id', { id })
      .getOne();
    if(!offer) {
      throw new NotFoundException();
    }
    return offer;
  }

  private async getDtoRelations(dto: OfferDto) {
    return {
      domain: await this.domainsService.findOne(dto.domainId),
      teacher: await this.teachersService.findOne(dto.teacherId),
      topics: await this.topicsService.findByIds(dto.topicIds),
    };
  }

  async create(dto: OfferDto): Promise<Offer> {
    const relations = await this.getDtoRelations(dto);
    const offer = this.offersRepository.create({
      ...dto,
      ...relations,
    });
    await this.offersRepository.save(offer);
    return this.findOne(offer.id);
  }

  async update(id: number, dto: OfferDto): Promise<Offer> {
    const offer = await this.findOne(id);
    if(offer.teacher.id !== dto.teacherId) {
      throw new ForbiddenException();
    }
    const relations = await this.getDtoRelations(dto);
    const updatedOffer = this.offersRepository.merge(offer, {
      ...dto,
      ...relations,
    });
    await this.offersRepository.save(updatedOffer);
    return this.findOne(id);
  }

  async delete(id: number, teacherId?: number): Promise<void> {
    const offer = await this.findOne(id, true);
    if(teacherId && offer.teacher.id !== teacherId) {
      throw new ForbiddenException();
    }
    if(offer.takenSeats > 0) {
      throw new BadRequestException('Ofertele cu studenți acceptați nu pot fi șterse.');
    }
    await this.offersRepository.remove(offer);
  }
}