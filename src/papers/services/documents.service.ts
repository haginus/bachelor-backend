import { BadRequestException, ForbiddenException, Injectable, NotFoundException, StreamableFile } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Document } from "../entities/document.entity";
import { IsNull, Repository, DataSource, In } from "typeorm";
import { User } from "src/users/entities/user.entity";
import { UploadDocumentDto } from "../dto/upload-document.dto";
import { UserType } from "src/lib/enums/user-type.enum";
import { Paper } from "../entities/paper.entity";
import { CommitteeMember } from "src/grading/entities/committee-member.entity";
import { DocumentCategory } from "src/lib/enums/document-category.enum";
import { DocumentType } from "src/lib/enums/document-type.enum";
import { DocumentUploadPerspective } from "src/lib/enums/document-upload-perspective.enum";
import { SessionSettingsService } from "src/common/services/session-settings.service";
import { CreateDocumentDto } from "../dto/create-document.dto";
import { getDocumentStoragePath, indexArray } from "src/lib/utils";
import { mimeTypeExtensions } from "src/lib/mimes";
import { writeFile, readFile, stat } from "fs/promises";
import { DocumentGenerationService } from "src/document-generation/services/document-generation.service";
import { isEqual } from "lodash";
import { SignDocumentDto } from "../dto/sign-document.dto";
import { createReadStream } from "fs";
import { DocumentReuploadRequest } from "../entities/document-reupload-request.entity";

@Injectable()
export class DocumentsService {
  
  constructor(
    @InjectRepository(Document) private readonly documentsRepository: Repository<Document>,
    @InjectRepository(Paper) private readonly papersRepository: Repository<Paper>,
    private readonly sessionSettingsService: SessionSettingsService,
    private readonly dataSource: DataSource,
    private readonly documentGenerationService: DocumentGenerationService,
  ) {}

  async findOne(id: number, user?: User): Promise<Document> {
    const document = await this.documentsRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!document) {
      throw new NotFoundException();
    }
    if(document.deletedAt && user && user.type !== UserType.Admin && user.type !== UserType.Secretary) {
      throw new NotFoundException();
    }
    await this.checkDocumentReadAccess(document, user);
    return document;
  }

  private async _getDocumentContentPath(id: number, user?: User): Promise<string> {
    const document = await this.findOne(id, user);
    const fileExtension = mimeTypeExtensions[document.mimeType];
    return this._getStoragePath(`${document.id}.${fileExtension}`);
  }

  async getDocumentContent(id: number, user?: User): Promise<Buffer> {
    const storagePath = await this._getDocumentContentPath(id, user);
    return readFile(storagePath);
  }

  async getDocumentContentStream(id: number, user?: User): Promise<StreamableFile> {
    const storagePath = await this._getDocumentContentPath(id, user);
    const statResult = await stat(storagePath);
    return new StreamableFile(createReadStream(storagePath), { length: statResult.size });
  }

  async findUploadHistory(paperId: number, name: string): Promise<Document[]> {
    return this.documentsRepository.find({
      where: { paperId, name },
      order: { createdAt: 'DESC' },
      relations: { uploadedBy: true },
      withDeleted: true,
    });
  }

  async upload({ name, type, paperId, file }: UploadDocumentDto, user: User) {
    if(type !== DocumentType.Copy) {
      throw new BadRequestException('Puteți încărca doar documente de tip copie.');
    }
    if(!file) {
      throw new BadRequestException('Fișierul este obligatoriu pentru acest tip de document.');
    }
    const { requiredDocument } = await this.checkDocumentWriteAccess({ name, type, paperId }, user);
    const mimeTypes = requiredDocument.acceptedMimeTypes.split(',');
    if(!mimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`MIME Type-ul fișierului este invalid. Tipuri acceptate: ${mimeTypes.join(', ')}`);
    }
    return this.create(
      {
        name,
        type,
        mimeType: file.mimetype,
        paperId,
        category: requiredDocument.category,
        uploadedById: user.id,
        meta: {},
      },
      file.buffer,
      user,
      user.type === UserType.Admin || user.type === UserType.Secretary,
    );
  }

  async sign({ name, paperId }: SignDocumentDto, user?: User) {
    const { requiredDocument, paper } = await this.checkDocumentWriteAccess({ name, type: 'signed', paperId }, user);
    const generationProps = await this.documentGenerationService.getStudentDocumentGenerationProps(paperId, paper.studentId);
    const documentContent = await this.documentGenerationService.generatePaperDocument(name, generationProps);
    return this.create(
      {
        name,
        type: DocumentType.Signed,
        mimeType: 'application/pdf',
        paperId,
        category: requiredDocument.category,
        uploadedById: user ? user.id : null,
        meta: {},
      },
      documentContent,
      user,
      user?.type === UserType.Admin || user?.type === UserType.Secretary,
    );
  }

  async generatePaperDocuments(paperId: number): Promise<Document[]> {
    const generationProps = await this.documentGenerationService.getStudentDocumentGenerationProps(paperId);
    if(!generationProps.paper || !generationProps.student.extraData) {
      // We don't have enough data to generate documents
      return [];
    }
    const requiredDocuments = generationProps.paper.requiredDocuments.filter(doc => doc.types[DocumentType.Generated]);
    const existingDocuments = await this.documentsRepository.find({
      where: {
        paperId,
        name: In(requiredDocuments.map(doc => doc.name)),
        type: DocumentType.Generated,
      },
    });
    const existingDocumentsByName = indexArray(existingDocuments, document => document.name);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const generatedDocuments: Document[] = [];
      for(const requiredDocument of requiredDocuments) {
        const generationMetadata = requiredDocument.getGenerationMetadata?.(generationProps);
        const existingGenerationMetadata = existingDocumentsByName[requiredDocument.name]?.meta?.['generationMetadata'];
        if(generationMetadata && existingGenerationMetadata && isEqual(generationMetadata, existingGenerationMetadata)) {
          continue;
        }
        const documentsToRemove = await queryRunner.manager.find(Document, {
          where: {
            paperId,
            name: requiredDocument.name,
          },
        });
        for(const document of documentsToRemove) {
          await queryRunner.manager.softRemove(document);
          // TODO: Log document deletion
        }
        const fileContent = await this.documentGenerationService.generatePaperDocument(requiredDocument.name, generationProps);
        const newDocument = this.documentsRepository.create({
          name: requiredDocument.name,
          category: requiredDocument.category,
          type: DocumentType.Generated,
          paperId,
          mimeType: 'application/pdf',
          uploadedById: null,
          meta: {
            generationMetadata,
          },
        });
        await queryRunner.manager.save(newDocument);
        const storagePath = this._getStoragePath(`${newDocument.id}.pdf`);
        await writeFile(storagePath, fileContent);
        generatedDocuments.push(newDocument);
      }
      await queryRunner.commitTransaction();
      return generatedDocuments;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async create(dto: CreateDocumentDto, fileContent: Buffer, user?: User, isReupload: boolean = false): Promise<Document> {
    const document = this.documentsRepository.create(dto);
    const fileExtension = mimeTypeExtensions[dto.mimeType];
    await this.dataSource.transaction(async manager => {
      if(isReupload) {
        await manager.softDelete(Document, { paperId: dto.paperId, name: dto.name, type: dto.type, deletedAt: IsNull() });
      }
      await manager.save(document);
      const storagePath = this._getStoragePath(`${document.id}.${fileExtension}`);
      await writeFile(storagePath, fileContent);
    });
    return document;
  }

  async updateDocumentContent(document: Document, newContent: Buffer): Promise<Document> {
    const fileExtension = mimeTypeExtensions[document.mimeType];
    const storagePath = this._getStoragePath(`${document.id}.${fileExtension}`);
    await writeFile(storagePath, newContent);
    return document;
  }

  private async _userIsInCommittee(committeeId: number, userId: number): Promise<boolean> {
    const count = await this.dataSource.createQueryBuilder()
      .select()
      .from(CommitteeMember, 'committeeMember')
      .where('committeeMember.committeeId = :committeeId', { committeeId })
      .andWhere('committeeMember.teacherId = :teacherId', { teacherId: userId })
      .getCount();
    return count > 0;
  }

  private async _studentCanUpload(category: DocumentCategory): Promise<boolean> {
    const sessionSettings = await this.sessionSettingsService.getSettings();
    if(!sessionSettings) {
      return false;
    }
    if(category === DocumentCategory.PaperFiles) {
      return sessionSettings.canUploadPaperFiles();
    } else if(category === DocumentCategory.SecretaryFiles) {
      return sessionSettings.canUploadSecretaryFiles();
    } else {
      return false;
    }
  }

  private async _hasReuploadRequest(paperId: number, documentName: string): Promise<boolean> {
    const requests = await this.dataSource.getRepository(DocumentReuploadRequest).find({
      where: { paperId, documentName },
    });
    return requests.some(request => request.isActive());
  }

  private async checkDocumentReadAccess(document: { paperId: number; category: DocumentCategory; uploadedById?: number | null; }, user?: User) {
    if(!user || user.type === UserType.Admin || user.type === UserType.Secretary || document.uploadedById === user.id) {
      return;
    }
    const getDocumentPaper = () => this.papersRepository.findOneOrFail({
      where: { id: document.paperId },
      select: { id: true, studentId: true, teacherId: true, committeeId: true },
    });
    if(user.type === UserType.Student) {
      const paper = await getDocumentPaper();
      if(paper.studentId !== user.id) {
        throw new ForbiddenException();
      }
    } else if(user.type === UserType.Teacher) {
      if(document.category !== DocumentCategory.PaperFiles) {
        throw new ForbiddenException();
      }
      const paper = await getDocumentPaper();
      if(paper.teacherId !== user.id) {
        // As a last resort, check if the teacher is in committee
        if(!await this._userIsInCommittee(paper.committeeId, user.id)) {
          throw new ForbiddenException();
        }
      }
    }
  }

  private async checkDocumentWriteAccess({ name, type, paperId, isDelete = false }: { name: string; type: DocumentType; paperId: number; isDelete?: boolean }, user?: User) {
    if(type == DocumentType.Generated) {
      throw new BadRequestException('Nu puteți modifica un document de tip generat.');
    }
    const paper = await this.papersRepository.findOne({ where: { id: paperId } });
    if(!paper) {
      throw new NotFoundException('Lucrarea nu a fost găsită.');
    }
    if(paper.isValid === false) {
      throw new BadRequestException('Nu puteți încărca documente pentru o lucrare invalidă.');
    }
    const requiredDocument = paper.requiredDocuments.find(doc => doc.name === name);
    if(!requiredDocument) {
      throw new BadRequestException('Document invalid.');
    }
    if(!requiredDocument.types[type]) {
      throw new BadRequestException('Tip de document invalid.');
    }
    if(user && user.type !== UserType.Admin && user.type !== UserType.Secretary) {
      switch(requiredDocument.uploadBy) {
        case DocumentUploadPerspective.Student:
          if(user.type !== UserType.Student || paper.studentId !== user.id) {
            throw new ForbiddenException();
          }
          if(!await this._studentCanUpload(requiredDocument.category) && !await this._hasReuploadRequest(paperId, name)) {
            throw new BadRequestException("Nu suntem în termenul în care puteți modifica acest document.");
          }
          break;
        case DocumentUploadPerspective.Teacher:
          if(user.type !== UserType.Teacher || paper.teacherId !== user.id) {
            throw new ForbiddenException();
          }
          break;
        case DocumentUploadPerspective.Committee:
          if(user.type !== UserType.Teacher || !await this._userIsInCommittee(paper.committeeId, user.id)) {
            throw new ForbiddenException();
          }
          break;
        default:
          throw new ForbiddenException();
      }
      if(!isDelete) {
        const existingDocuments = await this.documentsRepository.find({
          where: { paperId, name },
        });
        if(type === DocumentType.Signed) {
          const generatedDocument = existingDocuments.find(doc => doc.type === DocumentType.Generated);
          if(!generatedDocument) {
            throw new BadRequestException('Documentul generat nu există.');
          }
          if(existingDocuments.some(doc => doc.type === DocumentType.Signed)) {
            throw new BadRequestException('Documentul este deja semnat.');
          }
        } else if(type === DocumentType.Copy) {
          if(existingDocuments.some(doc => doc.type === DocumentType.Copy)) {
            throw new BadRequestException('Documentul este deja încărcat.');
          }
        }
      }
    }
    // If the paper is validated, the only allowed perspectives are 'teacher' (while grading hasn't started yet) and 'committee'
    if(
      paper.isValid && 
      (
        (requiredDocument.uploadBy !== DocumentUploadPerspective.Teacher && requiredDocument.uploadBy !== DocumentUploadPerspective.Committee) ||
        (requiredDocument.uploadBy === DocumentUploadPerspective.Teacher && (await this.sessionSettingsService.getSettings()).allowGrading && user?.type !== UserType.Admin && user?.type !== UserType.Secretary)
      )
    ) {
      throw new BadRequestException('Perioada de încărcare a documentelor a expirat.');
    }
    return { requiredDocument, paper };
  }

  async delete(id: number, user: User): Promise<void> {
    const document = await this.findOne(id, user);
    await this.checkDocumentWriteAccess({ ...document, isDelete: true }, user);
    await this.documentsRepository.softRemove(document);
  }

  private _getStoragePath(fileName: string): string {
    return getDocumentStoragePath(fileName);
  }
}