import { BadRequestException, Injectable } from '@nestjs/common';
import { DocumentGenerationService } from 'src/document-generation/services/document-generation.service';

@Injectable()
export class ReportsService {

  constructor(
    private readonly documentGenerationService: DocumentGenerationService,
  ) {}

  async generateReportFile(fileName: string): Promise<Buffer> {
    switch(fileName) {
      case 'committee_compositions_pdf':
        return this.documentGenerationService.generateCommitteeCompositionsPdf();
      case 'student_assignation_pdf':
        return this.documentGenerationService.generateCommitteeStudentAssignationPdf();
      case 'student_assignation_xlsx':
        return this.documentGenerationService.generateCommitteeStudentAssignationXlsx();
      case 'paper_list_xlsx':
        return this.documentGenerationService.generatePapersXlsx({ fullStudent: true });
      case 'submitted_paper_list_xlsx':
        return this.documentGenerationService.generatePapersXlsx({ onlySubmitted: true, fullStudent: true });
      default:
        throw new BadRequestException('Numele fișierului specificat nu este valid.');
    }
  }

}
