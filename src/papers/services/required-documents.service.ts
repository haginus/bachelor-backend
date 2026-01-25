import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Paper } from "../entities/paper.entity";
import { Repository } from "typeorm";
import { SessionSettingsService } from "src/common/services/session-settings.service";
import { requiredDocumentSpecs } from "src/lib/required-document-specs";
import { plainToInstance } from "class-transformer";
import { RequiredDocumentDto } from "src/lib/dto/required-document.dto";

@Injectable()
export class RequiredDocumentsService {

  constructor(
    @InjectRepository(Paper) private readonly papersRepository: Repository<Paper>,
    private readonly sessionSettingsService: SessionSettingsService,
  ) {}

  async getRequiredDocumentsByPaperId(paperId: number) {
    const paper = await this.papersRepository.findOne({
      where: { id: paperId },
      relations: {
        student: {
          extraData: true,
        }
      }
    });
    if(!paper) {
      throw new NotFoundException('Lucrearea nu există.');
    }
    return this.getRequiredDocumentsForPaper(paper);
  }

  async getRequiredDocumentsForPaper(paper: Paper) {
    const sessionSettings = await this.sessionSettingsService.getSettings();
    const specs = requiredDocumentSpecs.filter(spec => {
      if(!spec.onlyFor) {
        return true;
      }
      return spec.onlyFor({ paper, sessionSettings });
    });
    return plainToInstance(RequiredDocumentDto, specs, { excludeExtraneousValues: true });
  }

}