import { BadRequestException, Injectable, StreamableFile } from '@nestjs/common';
import { createReadStream, statSync } from 'fs';
import { BehaviorSubject } from 'rxjs';
import { DocumentGenerationService } from '../document-generation/services/document-generation.service';
import { FileGenerationStatus } from '../lib/interfaces/file-generation-status.interface';

@Injectable()
export class ReportsService {

  constructor(
    private readonly documentGenerationService: DocumentGenerationService,
  ) {}

  private readonly finalReportGenerationStatus = new BehaviorSubject<FileGenerationStatus>({
    progress: 0,
    status: 'not_started',
  });

  getFinalReportGenerationStatus() {
    return this.finalReportGenerationStatus.asObservable();
  }

  generateFinalReport() {
    if (this.finalReportGenerationStatus.value.status === 'in_progress') {
      throw new BadRequestException('Raportul final este deja în curs de generare.');
    }

    this.documentGenerationService.generateFinalReportArchive().subscribe({
      next: (status) => {
        this.finalReportGenerationStatus.next(status);
      },
      error: () => {
        this.finalReportGenerationStatus.next({
          progress: this.finalReportGenerationStatus.value.progress,
          status: 'failed',
        });
      },
    });
  }

  getFinalReport() {
    const status = this.finalReportGenerationStatus.value;
    if (status.status !== 'completed' || !status.filePath) {
      throw new BadRequestException('Raportul final nu a fost încă generat.');
    }
    const statResult = statSync(status.filePath);
    return new StreamableFile(createReadStream(status.filePath), { length: statResult.size });
  }

  async generateReportFile(fileName: string): Promise<Buffer> {
    switch(fileName) {
      case 'written_exam_catalog_pdf':
        return this.documentGenerationService.generateWrittenExamCatalogPdf();
      case 'written_exam_catalog_docx':
        return this.documentGenerationService.generateWrittenExamCatalogDocx();
      case 'final_catalog_pdf':
        return this.documentGenerationService.generateFinalCatalogPdf();
      case 'final_catalog_docx':
        return this.documentGenerationService.generateFinalCatalogDocx();
      case 'centralizing_catalog_pdf':
        return this.documentGenerationService.generateCentralizingCatalogPdf();
      case 'centralizing_catalog_docx':
        return this.documentGenerationService.generateCentralizingCatalogDocx();
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
