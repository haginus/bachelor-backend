import React from "react";
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { SessionSettingsService } from "src/common/services/session-settings.service";
import { Paper } from "src/papers/entities/paper.entity";
import { DataSource, EntityManager } from "typeorm";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import { SignUpForm } from "../templates/sign-up-form";
import path from "path";
import { LiquidationForm } from "../templates/liquidation-form";
import { StatutoryDeclaration } from "../templates/statutory_declaration";
import { StudentDocumentGenerationProps } from "src/lib/interfaces/student-document-generation-props.interface";
import { Signature } from "../entities/signature.entity";
import { SignaturesService } from "./signatures.service";
import { SignUpRequest } from "src/users/entities/sign-up-request.entity";
import { sortArray } from "src/lib/utils";
import ExcelJS from 'exceljs';
import { DOMAIN_TYPES, FUNDING_FORMS, STUDY_FORMS } from "../constants";

@Injectable()
export class DocumentGenerationService {

  constructor(
    private readonly dataSource: DataSource,
    private readonly sessionSettingsService: SessionSettingsService,
  ) {
    Font.register({
      family: 'Liberation Serif',
      fonts: [
        { src: path.join(process.cwd(), 'assets/fonts/LiberationSerif-Regular.ttf') },
        { src: path.join(process.cwd(), 'assets/fonts/LiberationSerif-Bold.ttf'), fontWeight: 'bold' },
        { src: path.join(process.cwd(), 'assets/fonts/LiberationSerif-Italic.ttf'), fontStyle: 'italic' },
      ],
    });
    Font.registerHyphenationCallback(word => [word]);
    this.signaturesService = new SignaturesService(
      this.dataSource.getRepository(Signature),
      this.dataSource,
    );
  }

  private signaturesService: SignaturesService;

  async getStudentDocumentGenerationProps(paperId: number, signatureUserId?: number, manager?: EntityManager): Promise<StudentDocumentGenerationProps> {
    manager = manager || this.dataSource.manager;
    let signatureSample: string | undefined = undefined;
    if(signatureUserId) {
      const signature = await this.signaturesService.findOneByUserId(signatureUserId);
      if(!signature) {
        throw new BadRequestException('Înregistrați o semnătură înainte de a semna documente.');
      }
      signatureSample = await this.signaturesService.getSignatureSampleBase64URI(signature.id);
    }
    const paper = await manager.getRepository(Paper).findOne({
      where: { id: paperId },
      relations: {
        teacher: { profile: false },
        student: { 
          profile: false,
          extraData: true,
          specialization: {
            domain: true,
          }
        },
      }
    });
    if(!paper) {
      throw new NotFoundException(`Paper with id ${paperId} not found`);
    }
    return {
      student: paper.student,
      paper,
      sessionSettings: await this.sessionSettingsService.getSettings(),
      signatureSample,
    }
  }

  generatePaperDocument(name: string, props: StudentDocumentGenerationProps) {
    switch(name) {
      case 'sign_up_form':
        return this.generateSignUpForm(props);
      case 'liquidation_form':
        return this.generateLiquidationForm(props);
      case 'statutory_declaration':
        return this.generateStatutoryDeclaration(props);
      default:
        throw new InternalServerErrorException(`No document generation template found for document name: ${name}`);
    }
  }

  generateSignUpForm(props: StudentDocumentGenerationProps) {
    return renderToBuffer(<SignUpForm {...props} />);
  }

  generateLiquidationForm(props: StudentDocumentGenerationProps) {
    return renderToBuffer(<LiquidationForm {...props} />);
  }

  generateStatutoryDeclaration(props: StudentDocumentGenerationProps) {
    return renderToBuffer(<StatutoryDeclaration {...props} />);
  }

  async generateSignUpRequestsExcel(): Promise<Buffer> {
    const requests = await this.dataSource.manager.getRepository(SignUpRequest).find({
      relations: {
        specialization: { domain: true },
      }
    });
    sortArray(requests, [
      request => request.specialization?.domain.name || '',
      request => request.specialization?.name || '',
      request => request.group,
      request => request.lastName,
      request => request.firstName,
    ]);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Cereri');
    sheet.addTable({
      name: 'Table1',
      ref: 'A1',
      headerRow: true,
      columns: [
        { name: 'ID' },
        { name: 'Nume și prenume' },
        { name: 'CNP' },
        { name: 'Număr matricol' },
        { name: 'An înmatriculare', filterButton: true },
        { name: 'Promoție', filterButton: true },
        { name: 'Domeniu', filterButton: true },
        { name: 'Specializare', filterButton: true },
        { name: 'Grupă', filterButton: true },
        { name: 'Formă de finanțare', filterButton: true },
        { name: 'E-mail' },
      ],
      rows: requests.map(request => {
        const domain = request.specialization?.domain;
        return [
          request.id,
          request.lastName + ' ' + request.firstName,
          request.CNP,
          request.identificationCode,
          request.matriculationYear,
          request.promotion,
          domain ? `${domain.name} - ${DOMAIN_TYPES[domain.type]}` : '',
          request.specialization ? `${request.specialization.name} - ${STUDY_FORMS[request.specialization.studyForm]}` : '',
          request.group,
          FUNDING_FORMS[request.fundingForm],
          request.email,
        ];
      })
    });
    this._autoSizeColumns(sheet);
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  private _autoSizeColumns(worksheet: ExcelJS.Worksheet) {
    worksheet.columns.forEach(column => {
      let maxLength = 10;
      column?.eachCell?.({ includeEmpty: true }, cell => {
        const cellValue = cell.value ? cell.value.toString() : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = maxLength + 2;
    });
  }
  
}