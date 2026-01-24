import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Paper } from "../entities/paper.entity";
import { FindOptionsRelations, Repository } from "typeorm";
import { merge } from "lodash";

@Injectable()
export class PapersService {
  
  constructor(
    @InjectRepository(Paper) private readonly papersRepository: Repository<Paper>,
  ) {}

  defaultRelations: FindOptionsRelations<Paper> = {
    student: true,
    teacher: true,
    documents: true,
    topics: true,
  };

  private mergeRelations(relations: FindOptionsRelations<Paper>): FindOptionsRelations<Paper> {
    return merge({}, this.defaultRelations, relations);
  }

  async findOneByStudent(studentId: number): Promise<Paper> {
    const paper = await this.papersRepository.findOne({
      where: { student: { id: studentId } },
      relations: this.defaultRelations,
    });
    if(!paper) {
      throw new NotFoundException();
    }
    return paper;
  }

  async findAllByTeacher(teacherId: number): Promise<Paper[]> {
    return this.papersRepository.find({
      where: { teacher: { id: teacherId } },
      relations: this.mergeRelations({ teacher: false }),
    });
  }

}