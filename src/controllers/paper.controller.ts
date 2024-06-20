import { Op, Transaction } from "sequelize";
import { Document, DocumentReuploadRequest, Domain, Paper, sequelize, SessionSettings, Specialization, Student, StudentExtraData, Teacher, User } from "../models/models";
import { changeUserTree, copyObject, inclusiveDate, ResponseError, ResponseErrorForbidden } from "../util/util";
import { getStoragePath } from "./document.controller";
import * as DocumentController from './document.controller';
import * as fs from 'fs';
import { StudentDocumentGenerationProps } from "../documents/types";

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
  const transaction = await sequelize.transaction();
  const paper = await Paper.scope(['student', 'teacher']).findOne({ where: { id: paperId }});
  if (!paper) {
    throw new ResponseError("Lucrarea nu există.", "PAPER_NOT_FOUND", 404);
  }
  const sessionSettings = await SessionSettings.findOne();
  editPaperGuard(paper, user, sessionSettings);
  const titleUpdated = paper.title != title;
  let prevTitle = paper.title, prevDesc = paper.description;
  try {
    paper.title = title;
    paper.description = description;
    await paper.save(); // out of transaction is intentional
    await paper.setTopics(topicIds, { transaction });
    if (titleUpdated) {
      const extraData = await paper.student.getStudentExtraDatum();
      if (extraData != null) {
        await generatePaperDocuments(mapPaper(paper), extraData, sessionSettings, transaction);
      }
    }
    await transaction.commit();
    return { success: true, documentsGenerated: titleUpdated };
  } catch (err) {
    paper.title = prevTitle;
    paper.description = prevDesc;
    await paper.save();
    await transaction.rollback();
    throw err;
  }
}

export async function generatePaperDocuments(paper: MappedPaper, extraData: StudentExtraData, sessionSettings: SessionSettings, transaction?: Transaction) {
  const ownTransaction = !transaction;
  transaction = transaction || (await sequelize.transaction());

  const student = await Student.findOne({
    where: { id: paper.studentId }, 
    include: [User, Domain, Specialization],
    transaction
  });
  
  try {
    // delete old generated and signed documents
    await Document.destroy({
      transaction,
      where: {
        paperId: paper.id,
        name: {
          [Op.in]: ['sign_up_form', 'statutory_declaration', 'liquidation_form']
        }
      }
    });

    const generationProps: StudentDocumentGenerationProps = {
      student,
      extraData,
      paper,
      sessionSettings,
    }

    let signUpFormBuffer = await DocumentController.generateSignUpForm(generationProps);
    let signUpFormDocument = await Document.create({
      name: 'sign_up_form',
      category: "secretary_files",
      type: 'generated',
      paperId: paper.id,
      mimeType: 'application/pdf',
      uploadedBy: null
    }, { transaction });
    fs.writeFileSync(getStoragePath(`${signUpFormDocument.id}.pdf`), signUpFormBuffer); // write to storage

    let statutoryDeclarationBuffer = await DocumentController.generateStatutoryDeclaration(generationProps);
    let statutoryDeclarationDocument = await Document.create({
      name: 'statutory_declaration',
      category: "secretary_files",
      type: 'generated',
      paperId: paper.id,
      mimeType: 'application/pdf',
      uploadedBy: null
    }, { transaction });
    fs.writeFileSync(getStoragePath(`${statutoryDeclarationDocument.id}.pdf`), statutoryDeclarationBuffer); // write to storage

    let liquidationFormBuffer = await DocumentController.generateLiquidationForm(generationProps);  // generate PDF
    let liquidationFormDocument = await Document.create({
      name: 'liquidation_form', category: "secretary_files", type: 'generated',
      paperId: paper.id, mimeType: 'application/pdf', uploadedBy: null
    }, { transaction });

    fs.writeFileSync(getStoragePath(`${liquidationFormDocument.id}.pdf`), liquidationFormBuffer); // write to storage

    if(ownTransaction) await transaction.commit();
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
  try {
    paper.submitted = submit;
    if(!submit) {
      paper.committeeId = null;
    }
    await paper.save();
    return { success: true };
  } catch (err) {
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