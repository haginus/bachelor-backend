import { Op, Transaction } from "sequelize";
import { Document, DocumentReuploadRequest, Domain, Log, Paper, sequelize, SessionSettings, Specialization, Student, StudentExtraData, Teacher, User } from "../models/models";
import { arrayMap, changeUserTree, copyObject, inclusiveDate, ResponseError, ResponseErrorForbidden } from "../util/util";
import { getStoragePath } from "./document.controller";
import * as DocumentController from './document.controller';
import * as fs from 'fs';
import { StudentDocumentGenerationProps } from "../documents/types";
import { Logger } from "../util/logger";
import { LogName } from "../lib/types/enums/log-name.enum";
import { paperRequiredDocuments } from "../paper-required-documents";
import { isEqual } from "lodash";
import { deepDiff } from "../util/deep-diff";

export function mapPaper(paper: Paper) {
  const plainPaper = copyObject(paper);
  return {
    ...plainPaper,
    student: changeUserTree(plainPaper.student),
    teacher: changeUserTree(plainPaper.teacher),
  }
}

export type MappedPaper = ReturnType<typeof mapPaper>;

/** Check if student or teacher can edit paper. */
function editPaperGuard(paper: Paper, user: User, sessionSettings: SessionSettings) {
  if(user.type == 'admin') return;
  if(![paper.teacherId, paper.studentId].includes(user.id)) {
    throw new ResponseErrorForbidden("Nu puteți edita această lucrare.");
  }
  if(paper.isValid != null) {
    throw new ResponseErrorForbidden("Lucrarea a fost deja validată și nu mai poate fi editată.");
  }
  const today = Date.now();
  const endDateSecretary = inclusiveDate(sessionSettings.fileSubmissionEndDate).getTime();
  const paperCreatedAt = new Date(paper.createdAt);
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const timeConstraint = (user.type != 'student' || (paperCreatedAt.getTime() + SEVEN_DAYS <= today || today + SEVEN_DAYS >= endDateSecretary)) && 
    today <= endDateSecretary;
  if(!timeConstraint) {
    throw new ResponseErrorForbidden("Nu puteți edita lucrarea acum.");
  }
}

export async function editPaper(user: User, paperId: number, title: string, description: string, topicIds: number[]) {
  const paper = await Paper.scope(['student', 'teacher', 'topics']).findOne({ where: { id: paperId }});
  if (!paper) {
    throw new ResponseError("Lucrarea nu există.", "PAPER_NOT_FOUND", 404);
  }
  const sessionSettings = await SessionSettings.findOne();
  editPaperGuard(paper, user, sessionSettings);
  const oldPaper = JSON.parse(JSON.stringify(paper)) as Paper;
  const titleUpdated = paper.title != title;
  const transaction = await sequelize.transaction();
  try {
    paper.title = title;
    paper.description = description;
    await paper.save({ transaction });
    await paper.setTopics(topicIds, { transaction });
    let documentsGenerated = false;
    const paperPayload = {
      title,
      description,
      topicIds,
      studentId: paper.studentId,
      teacherId: paper.teacherId,
      type: paper.type,
    };
    await Logger.log(user, {
      name: LogName.PaperUpdated,
      paperId: paper.id,
      meta: {
        paperPayload,
        changedProperties: deepDiff(paperPayload, { ...oldPaper, topicIds: oldPaper.topics.map(t => t.id) }),
      }
    }, { transaction });
    if (titleUpdated) {
      const extraData = await paper.student.getStudentExtraDatum();
      if (extraData != null) {
        await generatePaperDocuments(mapPaper(paper), extraData, sessionSettings, transaction);
        documentsGenerated = true;
      }
    }
    await transaction.commit();
    return { success: true, documentsGenerated };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
export async function generatePaperDocuments(paper: MappedPaper, extraData: StudentExtraData, sessionSettings: SessionSettings, transaction?: Transaction) {
  function equalGenerationMetadata(a: Record<string, any>, b: Record<string, any>) {
    if(!a || !b) return false;
    return isEqual(a, b);
  }
  
  const ownTransaction = !transaction;
  transaction = transaction || (await sequelize.transaction());

  try {
    const student = await Student.findOne({
      where: { id: paper.studentId }, 
      include: [User, Domain, Specialization],
      transaction
    });
    const requiredGeneratedDocuments = paperRequiredDocuments.filter(doc => 'generated' in doc.types && doc.types.generated);
    const actualGeneratedDocuments = await Document.findAll({
      where: {
        paperId: paper.id,
        type: 'generated',
        name: {
          [Op.in]: requiredGeneratedDocuments.map(doc => doc.name)
        }
      },
      transaction,
    });
    const actualGeneratedDocumentsByName = arrayMap(actualGeneratedDocuments, doc => doc.name);

    const generationProps: StudentDocumentGenerationProps = {
      student,
      extraData,
      paper,
      sessionSettings,
    };

    async function generateDocument(name: string) {
      switch(name) {
        case 'sign_up_form':
          return DocumentController.generateSignUpForm(generationProps);
        case 'statutory_declaration':
          return DocumentController.generateStatutoryDeclaration(generationProps);
        case 'liquidation_form':
          return DocumentController.generateLiquidationForm(generationProps);
        default:
          throw new ResponseError("Documentul nu poate fi generat.", "INVALID_DOCUMENT_NAME");
      }
    }

    const generatedDocuments: Document[] = [];
    for(const requiredDocument of requiredGeneratedDocuments) {
      const generationMetadata = requiredDocument.getGenerationMetadata(generationProps);
      const existingDocument = actualGeneratedDocumentsByName[requiredDocument.name];
      if(equalGenerationMetadata(generationMetadata, existingDocument?.meta?.['generationMetadata'])) {
        // There is no need to regenerate the document
        continue;
      }
      // Remove the generated and signed documents if they exist
      const toRemoveDocuments = await Document.findAll({
        where: {
          paperId: paper.id,
          name: requiredDocument.name,
        },
        transaction,
      });
      for(const removedDocument of toRemoveDocuments) {
        await removedDocument.destroy({ transaction });
        await Logger.log(null, {
          name: LogName.DocumentDeleted,
          documentId: removedDocument.id,
          paperId: paper.id,
        }, { transaction });
      }

      const buffer = await generateDocument(requiredDocument.name);
      const document = await Document.create({
        name: requiredDocument.name,
        category: requiredDocument.category,
        type: 'generated',
        paperId: paper.id,
        mimeType: 'application/pdf',
        uploadedBy: null,
        meta: {
          generationMetadata,
        }
      }, { transaction });
      fs.writeFileSync(getStoragePath(`${document.id}.pdf`), buffer);
      await Logger.log(null, {
        name: LogName.DocumentCreated,
        documentId: document.id,
        paperId: paper.id,
      }, { transaction });
      generatedDocuments.push(document);
    }

    if(ownTransaction) {
      await transaction.commit();
    }
    return generatedDocuments;
  } catch (err) {
    if(ownTransaction) await transaction.rollback();
    console.log(err);
    throw err;
  }
}

export async function submitPaper(user: User, paperId: number, submit: boolean) {
  const paper = await Paper.scope(['student', 'teacher']).findOne({ where: { id: paperId }});
  if (!paper) {
    throw new ResponseError("Lucrarea nu există.", "PAPER_NOT_FOUND", 404);
  }
  if(!['admin', 'secretary'].includes(user.type)) {
    const sessionSettings = await SessionSettings.findOne();
    if (Date.now() > inclusiveDate(sessionSettings.paperSubmissionEndDate).getTime() || paper.isValid) {
      throw new ResponseErrorForbidden("Nu vă mai puteți înscrie/retrage din această sesiune.");
    }
    if(![paper.studentId, paper.teacherId].includes(user.id)) {
      throw new ResponseErrorForbidden();
    }
  }
  const transaction = await sequelize.transaction();
  try {
    paper.submitted = submit;
    if(!submit) {
      paper.committeeId = null;
    }
    await paper.save({ transaction });
    await Logger.log(user, {
      name: submit ? LogName.PaperSubmitted : LogName.PaperUnsubmitted,
      paperId: paper.id,
    }, { transaction });
    await transaction.commit();
    return { success: true };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function getDocumentReuploadRequests(user: User, paperId: number) {
  const paper = await Paper.scope(['student', 'teacher']).findOne({ where: { id: paperId }});
  if (!paper) {
    throw new ResponseError("Lucrarea nu există.", "PAPER_NOT_FOUND", 404);
  }
  if(['admin', 'secretary'].includes(user.type)) {
    if(![paper.studentId, paper.teacherId].includes(user.id)) {
      throw new ResponseErrorForbidden();
    }
  }
  return DocumentReuploadRequest.findAll({
    where: {
      paperId: paper.id,
    }
  });
}