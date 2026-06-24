import { BadRequestException, Injectable, StreamableFile } from '@nestjs/common';
import { createReadStream, statSync } from 'fs';
import { BehaviorSubject } from 'rxjs';
import { DocumentGenerationService } from '../document-generation/services/document-generation.service';
import { FileGenerationStatus } from '../lib/interfaces/file-generation-status.interface';
import { getContentDispositionHeader } from '../lib/utils';

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
    return new StreamableFile(createReadStream(status.filePath), { 
      length: statResult.size,
      disposition: getContentDispositionHeader('Raport final.zip'),
    });
  }

  async generateReportFile(fileName: string): Promise<StreamableFile> {
    switch(fileName) {
      case 'written_exam_catalog_pdf':
        return new StreamableFile(await this.documentGenerationService.generateWrittenExamCatalogPdf(), {
          type: 'application/pdf',
          disposition: getContentDispositionHeader('Catalog proba scrisă.pdf'),
        });
      case 'written_exam_catalog_docx':
        return new StreamableFile(await this.documentGenerationService.generateWrittenExamCatalogDocx(), {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          disposition: getContentDispositionHeader('Catalog proba scrisă.docx'),
        });
      case 'written_exam_after_disputes_catalog_pdf':
        return new StreamableFile(await this.documentGenerationService.generateWrittenExamCatalogPdf(true), {
          type: 'application/pdf',
          disposition: getContentDispositionHeader('Catalog proba scrisă după contestații.pdf'),
        });
      case 'written_exam_after_disputes_catalog_docx':
        return new StreamableFile(await this.documentGenerationService.generateWrittenExamCatalogDocx(true), {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          disposition: getContentDispositionHeader('Catalog proba scrisă după contestații.docx'),
        });
      case 'final_catalog_pdf':
        return new StreamableFile(await this.documentGenerationService.generateFinalCatalogPdf(), {
          type: 'application/pdf',
          disposition: getContentDispositionHeader('Catalog final.pdf'),
        });
      case 'final_catalog_docx':
        return new StreamableFile(await this.documentGenerationService.generateFinalCatalogDocx(), {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          disposition: getContentDispositionHeader('Catalog final.docx'),
        });
      case 'centralizing_catalog_pdf':
        return new StreamableFile(await this.documentGenerationService.generateCentralizingCatalogPdf(), {
          type: 'application/pdf',
          disposition: getContentDispositionHeader('Catalog centralizator.pdf'),
        });
      case 'centralizing_catalog_docx':
        return new StreamableFile(await this.documentGenerationService.generateCentralizingCatalogDocx(), {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          disposition: getContentDispositionHeader('Catalog centralizator.docx'),
        });
      case 'committee_compositions_pdf':
        return new StreamableFile(await this.documentGenerationService.generateCommitteeCompositionsPdf(), {
          type: 'application/pdf',
          disposition: getContentDispositionHeader('Componența comisiilor și planificarea pe săli și zile.pdf'),
        });
      case 'student_assignation_pdf':
        return new StreamableFile(await this.documentGenerationService.generateCommitteeStudentAssignationPdf(), {
          type: 'application/pdf',
          disposition: getContentDispositionHeader('Repartizarea studenților pe comisii.pdf'),
        });
      case 'student_assignation_xlsx':
        return new StreamableFile(await this.documentGenerationService.generateCommitteeStudentAssignationXlsx(), {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          disposition: getContentDispositionHeader('Repartizarea studenților pe comisii.xlsx'),
        });
      case 'paper_list_xlsx':
        return new StreamableFile(await this.documentGenerationService.generatePapersXlsx({ fullStudent: true }), {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          disposition: getContentDispositionHeader('Lista lucrărilor.xlsx'),
        });
      case 'submitted_paper_list_xlsx':
        return new StreamableFile(await this.documentGenerationService.generatePapersXlsx({ onlySubmitted: true, fullStudent: true }), {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          disposition: getContentDispositionHeader('Lista lucrărilor înscrise.xlsx'),
        });
      default:
        throw new BadRequestException('Numele fișierului specificat nu este valid.');
    }
  }

}
