import React from "react";
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { SessionSettingsService } from "../../common/services/session-settings.service";
import { Paper } from "../../papers/entities/paper.entity";
import { DataSource, EntityManager, FindOptionsWhere, In, IsNull, Not } from "typeorm";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import { SignUpForm } from "../templates/sign-up-form";
import path from "path";
import { LiquidationForm } from "../templates/liquidation-form";
import { StatutoryDeclaration } from "../templates/statutory_declaration";
import { StudentDocumentGenerationProps } from "../../lib/interfaces/student-document-generation-props.interface";
import { Signature } from "../entities/signature.entity";
import { SignaturesService } from "./signatures.service";
import { SignUpRequest } from "../../users/entities/sign-up-request.entity";
import { ellipsize, filterFalsy, getDocumentStoragePath, groupBy, indexArray, removeCharacters, safePath, sortArray } from "../../lib/utils";
import ExcelJS from 'exceljs';
import { DOMAIN_TYPES, FUNDING_FORMS, PAPER_TYPES, STUDY_FORMS } from "../constants";
import { Committee } from "../../grading/entities/committee.entity";
import { CommitteeCatalog as CommitteeCatalogPdf } from "../templates/committee-catalog";
import { CommitteeCatalog as CommitteeCatalogDocx, FinalCatalog as FinalCatalogDocx } from "../word-templates";
import { CommitteeFinalCatalog as CommitteeFinalCatalogPdf } from "../templates/committee-final-catalog";
import { requiredDocumentSpecs } from "../../lib/required-document-specs";
import archiver from "archiver";
import { Document } from "../../papers/entities/document.entity";
import { mimeTypeExtensions } from "../../lib/mimes";
import { createReadStream, createWriteStream } from "fs";
import { CommitteeStudentAssignation as CommitteeStudentAssignationPdf } from "../templates/committee-student-assignation";
import { CommitteeCompositions as CommitteeCompositionsPdf } from "../templates/committee-compositions";
import { FinalCatalog as FinalCatalogPdf } from "../templates/final-catalog";
import { Observable, Subscriber } from "rxjs";
import { FileGenerationStatus } from "../../lib/interfaces/file-generation-status.interface";
import { tmpdir } from "os";
import { SessionSettings } from "../../common/entities/session-settings.entity";
import { Student } from "../../users/entities/user.entity";
import { instanceToPlain } from "class-transformer";
import { render } from "@react-email/render";
import { StudentList } from "../templates-html/student-list";
import { Log } from "../../common/entities/log.entity";

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

  private async getCommitteesForGeneration(committeeIds?: number[], grades = true) {
    const committees = await this.dataSource.manager.getRepository(Committee).find({
      relations: {
        domains: true,
        members: {
          teacher: { profile: false },
        },
        papers: {
          grades: grades ? {
            committeeMember: true,
          } : false,
          teacher: { profile: false },
          student: { 
            profile: false, 
            extraData: true,
            specialization: { domain: true },
          },
        }
      },
      where: committeeIds ? { id: In(committeeIds) } : undefined,
    });
    const nameAndNumber = (name: string): [string, number] => {
      const numberPart = (name.match(/\d+/) || '')[0];
      return [name.replace(numberPart, ''), parseInt(numberPart)];
    }
    sortArray(committees, [
      committee => committee.domains[0].type,
      committee => nameAndNumber(committee.name)[0],
      committee => nameAndNumber(committee.name)[1],
    ]);
    return committees;
  }

  private async getCommitteeForGeneration(committeeId: number, grades = true) {
    const [committee] = await this.getCommitteesForGeneration([committeeId], grades);
    return committee;
  }

  private getPaperSortCriteria() {
    return [
      (paper: Paper) => paper.student.promotion,
      (paper: Paper) => [paper.student.lastName, paper.student.extraData?.parentInitial, paper.student.firstName].filter(Boolean).join(' '),
    ];
  }

  private async getCommitteeCatalogGenerationProps(committeeId: number): Promise<CommitteeCatalogGenerationProps> {
    const committee = await this.getCommitteeForGeneration(committeeId);
    sortArray(committee.papers, this.getPaperSortCriteria());
    const paperGroups = Object.values(
      groupBy(
        committee.papers,
        paper => [paper.student.promotion, paper.student.specialization.id].toString()
      )
    );
    const sessionSettings = await this.sessionSettingsService.getSettings();
    return {
      committee,
      paperGroups,
      sessionSettings,
    };
  }

  private async getCommitteeFinalCatalogGenerationProps(committeeId: number): Promise<CommitteeFinalCatalogGenerationProps> {
    const committee = await this.getCommitteeForGeneration(committeeId);
    sortArray(committee.papers, this.getPaperSortCriteria());
    const paperGroups = Object.values(
      groupBy(
        committee.papers,
        paper => paper.student.specialization.id,
      )
    );
    const paperPromotionGroups = paperGroups.map(papers => {
      return Object.values(
        groupBy(
          papers,
          paper => paper.student.promotion,
        )
      );
    });
    const sessionSettings = await this.sessionSettingsService.getSettings();
    return {
      committee,
      paperPromotionGroups,
      sessionSettings,
    };
  }

  async _generateCommitteeCatalogPdf(props: CommitteeCatalogGenerationProps): Promise<Buffer> {
    return renderToBuffer(<CommitteeCatalogPdf {...props} />);
  }

  async generateCommitteeCatalogPdf(committeeId: number): Promise<Buffer> {
    const props = await this.getCommitteeCatalogGenerationProps(committeeId);
    return this._generateCommitteeCatalogPdf(props);
  }

  async _generateCommitteeCatalogDocx(props: CommitteeCatalogGenerationProps): Promise<Buffer> {
    return CommitteeCatalogDocx(props);
  }

  async generateCommitteeCatalogDocx(committeeId: number): Promise<Buffer> {
    const props = await this.getCommitteeCatalogGenerationProps(committeeId);
    return this._generateCommitteeCatalogDocx(props);
  }

  async _generateCommitteeFinalCatalogPdf(props: CommitteeFinalCatalogGenerationProps): Promise<Buffer> {
    return renderToBuffer(<CommitteeFinalCatalogPdf {...props} />);
  }

  async generateCommitteeFinalCatalogPdf(committeeId: number): Promise<Buffer> {
    const props = await this.getCommitteeFinalCatalogGenerationProps(committeeId);
    return this._generateCommitteeFinalCatalogPdf(props);
  }

  private async getFinalCatalogGenerationProps(mode: 'final' | 'centralizing' = 'final') {
    let papers = await this.dataSource.manager.getRepository(Paper).find({
      relations: {
        grades: true,
        student: {
          profile: false,
          extraData: true,
          specialization: { domain: true },
        }
      },
      where: {
        committeeId: Not(IsNull()),
        student: {
          submission: {
            isSubmitted: true,
          }
        }
      }
    });
    if(mode === 'centralizing') {
      papers = papers.filter(paper => paper.gradeAverage && paper.gradeAverage >= 6);
    }
    sortArray(papers, this.getPaperSortCriteria());
    const paperGroups = Object.values(
      groupBy(
        papers,
        paper => paper.student.specialization.id,
      )
    );
    const paperPromotionGroups = paperGroups.map(papers => {
      return Object.values(
        groupBy(
          papers,
          paper => paper.student.promotion,
        )
      );
    });
    const sessionSettings = await this.sessionSettingsService.getSettings();
    return {
      mode,
      paperPromotionGroups,
      sessionSettings,
    };
  }

  async generateFinalCatalogPdf(): Promise<Buffer> {
    const props = await this.getFinalCatalogGenerationProps('final');
    return renderToBuffer(<FinalCatalogPdf {...props} />);
  }

  async generateFinalCatalogDocx(): Promise<Buffer> {
    const props = await this.getFinalCatalogGenerationProps('final');
    return FinalCatalogDocx(props);
  }

  async generateCentralizingCatalogPdf(): Promise<Buffer> {
    const props = await this.getFinalCatalogGenerationProps('centralizing');
    return renderToBuffer(<FinalCatalogPdf {...props} />);
  }

  async generateCentralizingCatalogDocx(): Promise<Buffer> {
    const props = await this.getFinalCatalogGenerationProps('centralizing');
    return FinalCatalogDocx(props);
  }

  async _generateCommitteeCompositionsPdf(committees: Committee[], sessionSettings: SessionSettings): Promise<Buffer> {
    const committeeGroups = Object.values(
      groupBy(
        committees,
        committee => committee.domains.map(domain => domain.id).sort().toString()
      )
    );
    return renderToBuffer(<CommitteeCompositionsPdf groups={committeeGroups} sessionSettings={sessionSettings} />);
  }

  async generateCommitteeCompositionsPdf(): Promise<Buffer> {
    const committees = await this.getCommitteesForGeneration();
    const sessionSettings = await this.sessionSettingsService.getSettings();
    return this._generateCommitteeCompositionsPdf(committees, sessionSettings);
  }

  private async getCommitteeStudentsAssignationGenerationProps(committeeIds?: number[]): Promise<CommitteeStudentAssignationGenerationProps> {
    const committees = await this.getCommitteesForGeneration(committeeIds);
    const sessionSettings = await this.sessionSettingsService.getSettings();
    return {
      committees,
      sessionSettings,
    };
  }

  async _generateCommitteeStudentAssignationPdf(props: CommitteeStudentAssignationGenerationProps): Promise<Buffer> {
    return renderToBuffer(<CommitteeStudentAssignationPdf {...props} />);
  }

  async generateCommitteeStudentAssignationPdf(committeeIds?: number[]): Promise<Buffer> {
    const props = await this.getCommitteeStudentsAssignationGenerationProps(committeeIds);
    return this._generateCommitteeStudentAssignationPdf(props);
  }

  async _generateCommitteeStudentAssignationXlsx({ committees }: CommitteeStudentAssignationGenerationProps): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    committees.forEach(committee => {
      const sheetName = ellipsize(
        removeCharacters(committee.name, ['/', '\\', '?', '*', ':', '[', ']']),
        31
      );
      const sheet = workbook.addWorksheet(sheetName);
      sortArray(committee.papers, [
        paper => paper.scheduledGrading?.getTime() || 0,
        paper => paper.id,
      ]);
      sheet.addTable({
        name: 'StudentTable' + committee.id,
        ref: 'A1',
        headerRow: true,
        columns: [
          { name: 'Programare', filterButton: true },
          { name: 'Nume și prenume', filterButton: true },
          { name: 'Profesor coordonator', filterButton: true },
          { name: 'Titlul lucrării', filterButton: true },
          { name: 'Domeniul', filterButton: true },
          { name: 'E-mail', filterButton: true }
        ],
        rows: this._tableRows(
          committee.papers.map(paper => {
            const student = paper.student;
            const domain = student.specialization.domain;
            return [
              paper.scheduledGrading?.toLocaleString('ro-RO', {
                timeZone: 'Europe/Bucharest',
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }) || '',
              student.fullName,
              paper.teacher.fullName,
              paper.title,
              `${domain.name} - ${DOMAIN_TYPES[domain.type]}`,
              student.email,
            ];
          })
        ),
      });
      this._autoSizeColumns(sheet);
    });
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  async generateCommitteeStudentAssignationXlsx(committeeIds?: number[]): Promise<Buffer> {
    const props = await this.getCommitteeStudentsAssignationGenerationProps(committeeIds);
    return this._generateCommitteeStudentAssignationXlsx(props);
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

  async generatePapersXlsx({ onlySubmitted = false, teacherId, fullStudent = false }: { onlySubmitted?: boolean; teacherId?: number; fullStudent?: boolean; }): Promise<Buffer> {
    const where: FindOptionsWhere<Paper> = {};
    if(teacherId) {
      where.teacher = { id: teacherId };
    }
    if(onlySubmitted) {
      where.student = {
        submission: {
          isSubmitted: true,
        }
      };
    }
    const papers = await this.dataSource.manager.getRepository(Paper).find({
      relations: {
        student: {
          specialization: { domain: true },
          extraData: true,
          profile: false,
          submission: true,
        },
        teacher: { profile: false },
        committee: true,
      },
      where,
    });
    sortArray(papers, [
      paper => paper.student.specialization.domain.name,
      paper => paper.student.specialization.name,
      paper => paper.type,
      paper => paper.student.lastName,
      paper => paper.student.extraData?.parentInitial || '',
      paper => paper.student.firstName,
    ]);
    const columns = filterFalsy<ExcelJS.TableColumnProperties>([
      { name: 'ID lucrare', filterButton: true },
      { name: 'Nume și prenume student', filterButton: true },
      { name: 'Inițiala părintelui', filterButton: true },
      { name: 'Profesor coordonator', filterButton: true },
      { name: 'Titlul lucrării', filterButton: true },
      { name: 'Tipul lucrării', filterButton: true },
      { name: 'Specializarea', filterButton: true },
      { name: 'Domeniul', filterButton: true },
      { name: 'Comisia', filterButton: true },
      { name: 'E-mail' },
      fullStudent && { name: 'Anul înmatriculării', filterButton: true },
      { name: 'Promoție', filterButton: true },
      { name: 'Lucrare validată', filterButton: true },
      fullStudent && { name: 'M.G. ani studiu', filterButton: true },
      { name: 'Lucrare înscrisă', filterButton: true },
    ]);
    const rows = papers.map(paper => {
      const student = paper.student;
      const domain = student.specialization.domain;
      const specialization = student.specialization;
      return filterFalsy<string | number>([
        paper.id,
        student.fullName,
        student.extraData?.parentInitial || '',
        paper.teacher.fullName,
        paper.title,
        PAPER_TYPES[paper.type],
        `${specialization.name} - ${STUDY_FORMS[specialization.studyForm]}`,
        `${domain.name} - ${DOMAIN_TYPES[domain.type]}`,
        paper.committee?.name || 'N/A',
        student.email,
        fullStudent && student.matriculationYear,
        student.promotion,
        paper.isValid === null ? 'N/A' : (paper.isValid ? 'Validată' : 'Invalidată'),
        fullStudent && (student.generalAverage?.toFixed(2) || 'N/A'),
        paper.student.submission?.isSubmitted ? 'Da' : 'Nu',
      ]);
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Lucrări');
    sheet.addTable({
      name: 'PapersTable',
      ref: 'A1',
      headerRow: true,
      columns,
      rows,
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

  private _tableRows(rows: any[][]) {
    if(rows.length === 0) {
      rows.push(['']);
    }
    return rows;
  }

  async generatePaperDocumentsArchive(paperIds: number[], documentNames?: string[]): Promise<Buffer> {
    const qb = this.dataSource.manager.getRepository(Paper).createQueryBuilder('paper')
      .whereInIds(paperIds)
      .leftJoinAndSelect('paper.student', 'student');
    if(documentNames && documentNames.length > 0) {
      qb.leftJoinAndSelect('paper.documents', 'document', 'document.name IN (:...documentNames)', { documentNames });
    } else {
      qb.leftJoinAndSelect('paper.documents', 'document');
    }
    const papers = await qb.getMany();
    if(papers.flatMap(paper => paper.documents).length == 0) {
      throw new BadRequestException('Nu există documente pentru lucrările selectate.');
    }
    const requiredDocumentsIndex = indexArray(requiredDocumentSpecs, doc => doc.name);
    const archive = archiver('zip', {
      zlib: { level: 0 }
    });
    papers.forEach(paper => {
      const studentName = `${paper.student.lastName} ${paper.student.firstName}`;
      const directoryName = `${studentName}, ${paper.title}`;
      const lastDocuments = paper.documents.reduce((acc, doc) => {
        acc[doc.name] = !acc[doc.name] || acc[doc.name].id < doc.id ? doc : acc[doc.name];
        return acc;
      }, {} as Record<string, Document>);
      Object.values(lastDocuments).forEach(document => {
        const requiredDoc = requiredDocumentsIndex[document.name];
        const extension = mimeTypeExtensions[document.mimeType];
        const buffer = createReadStream(getDocumentStoragePath(`${document.id}.${extension}`));
        archive.append(buffer, { prefix: directoryName, name: `${requiredDoc.title} - ${studentName}.${extension}` });
      });
    });
    return new Promise<Buffer>((resolve, reject) => {
      const buffers: Buffer[] = [];
      archive.on('data', (data: Buffer) => buffers.push(data));
      archive.on('end', () => resolve(Buffer.concat(buffers)));
      archive.on('error', reject);
      archive.finalize();
    });
  }

  generateFinalReportArchive(): Observable<FileGenerationStatus> {
    const progressSections = [
      { name: 'logs', weight: 0.05 },
      { name: 'catalogs', weight: 0.05 },
      { name: 'committee_files', weight: 0.05 },
      { name: 'committee_files_per_committee', weight: 0.2 },
      { name: 'student_list', weight: 0.1 },
      { name: 'student_documents', weight: 0.3 },
      { name: 'archive', weight: 0.25 },
    ] as const satisfies readonly ProgressSection<string>[];
    return this._createFileGenerationObservable(progressSections, async (progressTracker) => {
      const archive = archiver('zip', {
        zlib: { level: 6 },
      });
      async function appendAndBump(getBuffer: () => Promise<Buffer>, opts: archiver.EntryData, sectionName: typeof progressSections[number]['name'], deltaProgress: number) {
        const buffer = await getBuffer();
        archive.append(buffer, opts);
        progressTracker.bumpProgress(sectionName, deltaProgress);
      }
      const destination = safePath(tmpdir(), `/bachelor-backend/final-report-${Date.now()}.zip`);
      const output = createWriteStream(destination);

      archive.pipe(output);

      const logs = await this.dataSource.getRepository(Log).find();
      archive.append(JSON.stringify(logs, (k, v) => (v === null ? undefined : v), 2), { name: 'Loguri.json' });
      progressTracker.setProgress('logs', 1);

      // Catalogs
      await appendAndBump(() => this.generateFinalCatalogPdf(), { name: 'Catalog final.pdf' }, 'catalogs', 0.5);
      await appendAndBump(() => this.generateCentralizingCatalogPdf(), { name: 'Catalog centralizator.pdf' }, 'catalogs', 0.5);

      // Committee files
      const committees = await this.getCommitteesForGeneration(undefined, false);
      const sessionSettings = await this.sessionSettingsService.getSettings();
      await appendAndBump(() => this._generateCommitteeCompositionsPdf(committees, sessionSettings), { name: 'Comisii/Componența comisiilor.pdf' }, 'committee_files', 0.5);
      await appendAndBump(() => this._generateCommitteeStudentAssignationPdf({ committees, sessionSettings }), { name: 'Comisii/Repartizarea studenților pe comisii.pdf' }, 'committee_files', 0.5);

      // Committee files per committee
      const committeeCount = committees.length;
      for(let i = 0; i < committeeCount; i++) {
        const committee = committees[i];
        const catalogProps = await this.getCommitteeCatalogGenerationProps(committee.id);
        const finalCatalogProps = await this.getCommitteeFinalCatalogGenerationProps(committee.id);
        progressTracker.bumpProgress('committee_files_per_committee', 0.25 / committeeCount);
        const prefix = `Comisii/${committee.name}/`;
        await appendAndBump(() => this._generateCommitteeCatalogPdf(catalogProps), { name: `Catalog.pdf`, prefix }, 'committee_files_per_committee', 0.25 / committeeCount);
        await appendAndBump(() => this._generateCommitteeCatalogDocx(catalogProps), { name: `Catalog.docx`, prefix }, 'committee_files_per_committee', 0.25 / committeeCount);
        await appendAndBump(() => this._generateCommitteeFinalCatalogPdf(finalCatalogProps), { name: `Catalog final.pdf`, prefix }, 'committee_files_per_committee', 0.25 / committeeCount);
      }

      const students = await this.dataSource.manager.getRepository(Student).find({
        relations: {
          specialization: { domain: true },
          extraData: true,
          profile: false,
          paper: {
            teacher: { profile: false },
            documents: true,
            committee: true,
            grades: {
              committeeMember: {
                teacher: { profile: false },
              }
            }
          }
        },
        where: {
          paper: { committeeId: Not(IsNull()) },
        }
      });
      sortArray(students, [
        student => student.specialization.domain.name,
        student => student.specialization.name,
        student => student.group,
        student => student.lastName,
        student => student.extraData?.parentInitial || '',
        student => student.firstName,
      ]);
      const studentsByDomain = groupBy(students, student => student.specialization.domain.id);
      progressTracker.setProgress('student_list', 0.5);
      const domainCount = Object.keys(studentsByDomain).length;
      for(const domainId in studentsByDomain) {
        const students = studentsByDomain[domainId];
        const domain = students[0].specialization.domain;
        const studentList = await render(<StudentList domain={domain} students={students} />);
        const directoryName = `Studenți/${domain.name}_${DOMAIN_TYPES[domain.type]}`;
        archive.append(studentList, { name: `Listă studenți.html`, prefix: directoryName });
        progressTracker.bumpProgress('student_list', 0.5 / domainCount);
      }
      progressTracker.setProgress('student_list', 1);
      
      // Student documents
      const studentCount = students.length;
      const requiredDocumentsIndex = indexArray(requiredDocumentSpecs, doc => doc.name);
      for(let i = 0; i < studentCount; i++) {
        const student = students[i];
        const domain = student.specialization.domain;
        const directoryName = `Studenți/${domain.name}_${DOMAIN_TYPES[domain.type]}/${student.group}_${student.fullName}`;

        const jsonContent = JSON.stringify(instanceToPlain(student, { groups: ['full'] }), null, 2);
        archive.append(jsonContent, { prefix: directoryName, name: `Date.json` });

        const lastDocuments = student.paper.documents.reduce((acc, doc) => {
        acc[doc.name] = !acc[doc.name] || acc[doc.name].id < doc.id ? doc : acc[doc.name];
          return acc;
        }, {} as Record<string, Document>);

        Object.values(lastDocuments).forEach(document => {
          const requiredDoc = requiredDocumentsIndex[document.name];
          const extension = mimeTypeExtensions[document.mimeType];
          const buffer = createReadStream(getDocumentStoragePath(`${document.id}.${extension}`));
          archive.append(buffer, { prefix: directoryName, name: `${requiredDoc.title} - ${student.fullName}.${extension}` });
        });

        progressTracker.setProgress('student_documents', (i + 1) / studentCount);
      }

      archive.on('progress', (progress) => {
        progressTracker.setProgress('archive', progress.entries.processed / progress.entries.total);
      });

      await archive.finalize();
      return destination;
    });
  }

  private _createFileGenerationObservable<N extends string>(
    progressSections: readonly ProgressSection<N>[],
    fn: (progressTracker: ProgressTracker<N>) => Promise<string>
  ): Observable<FileGenerationStatus> {
    return new Observable<FileGenerationStatus>((subscriber) => {
      const progressTracker = new ProgressTracker<N>(subscriber, progressSections);
      fn(progressTracker).then((filePath) => {
        subscriber.next({ 
          progress: 1,
          status: 'completed',
          filePath,
          lastGeneratedAt: new Date(),
        });
        subscriber.complete();
      }).catch(error => {
        subscriber.error(error);
      });
    });
  }
  
}

interface ProgressSection<N = string> {
  name: N;
  weight: number;
}

class ProgressTracker<N extends string = string> {

  sectionMap: Record<N, ProgressSection<N>>;
  perSectionProgress: Record<N, number>;

  constructor(
    private readonly subscriber: Subscriber<FileGenerationStatus>,
    private readonly sections: readonly ProgressSection<N>[],
  ) {
    if(this.sections.reduce((acc, section) => acc + section.weight, 0) !== 1) {
      throw new Error('Progress sections weights must sum up to 1');
    }
    this.perSectionProgress = this.sections.reduce((acc, section) => {
      acc[section.name] = 0;
      return acc;
    }, {} as Record<N, number>);
    this.sectionMap = indexArray(this.sections, section => section.name);
    this._emitProgress();
  }

  setProgress(sectionName: N, progress: number) {
    this.perSectionProgress[sectionName] = progress;
    this._emitProgress();
  }

  bumpProgress(sectionName: N, deltaProgress: number) {
    this.perSectionProgress[sectionName] += deltaProgress;
    if(this.perSectionProgress[sectionName] > 1) {
      this.perSectionProgress[sectionName] = 1;
    }
    this._emitProgress();
  }

  private _emitProgress() {
    const totalProgress = Object.entries<number>(this.perSectionProgress).reduce((acc, [sectionName, progress]) => {
      const section = this.sectionMap[sectionName as N];
      if(!section) return acc;
      return acc + (progress * section.weight);
    }, 0);
    this.subscriber.next({
      status: 'in_progress',
      progress: totalProgress,
    });
  }
}

interface CommitteeCatalogGenerationProps {
  committee: Committee;
  paperGroups: Paper[][];
  sessionSettings: SessionSettings;
}

interface CommitteeFinalCatalogGenerationProps {
  committee: Committee;
  paperPromotionGroups: Paper[][][];
  sessionSettings: SessionSettings;
}

interface CommitteeStudentAssignationGenerationProps {
  committees: Committee[];
  sessionSettings: SessionSettings;
}