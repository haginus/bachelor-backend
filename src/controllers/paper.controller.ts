import { Op, Transaction } from "sequelize";
import { Document, Domain, Paper, sequelize, SessionSettings, Specialization, Student, StudentExtraData, Teacher, User } from "../models/models";
import { changeUserTree, copyObject, inclusiveDate, ResponseError, ResponseErrorForbidden } from "../util/util";
import { getStoragePath } from "./document.controller";
import * as DocumentController from './document.controller';
import * as fs from 'fs';

export function mapPaper(paper: Paper) {
  const plainPaper = copyObject(paper);
  return {
    ...plainPaper,
    student: changeUserTree(plainPaper.student),
    teacher: changeUserTree(plainPaper.teacher),
  }
}

export type MappedPaper = ReturnType<typeof mapPaper>;

/** Check if student can edit paper. */
export function editPaperGuard(paper: Paper, user: User, sessionSettings: SessionSettings) {
  if(![paper.teacherId, paper.studentId].includes(user.id)) {
    throw new ResponseErrorForbidden("Nu puteți edita această lucrare.");
  }
  if(paper.isValid != null) {
    throw new ResponseErrorForbidden("Lucrarea a fost deja validată și nu mai poate fi editată.");
  }
  if(user.type == 'admin') return;
  const today = Date.now();
  const endDateSecretary = inclusiveDate(sessionSettings.fileSubmissionEndDate).getTime();
  const paperCreatedAt = new Date(paper.createdAt);
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const timeConstraint = (paperCreatedAt.getTime() + SEVEN_DAYS <= today || today + SEVEN_DAYS >= endDateSecretary) && today <= endDateSecretary;
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
        await generatePaperDocuments(mapPaper(paper) as any, extraData, sessionSettings, transaction);
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

  const student = await Student.findOne({
    where: { id: paper.studentId }, 
    include: [User, Domain, Specialization] 
  });
  console.log(paper);
  const ownTransaction = !transaction;

  transaction = transaction || (await sequelize.transaction());
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

    let data = {
      ...copyObject(student),
      extra: extraData,
      paper: copyObject(paper),
      sessionSettings: copyObject(sessionSettings)
    }

    let signUpFormBuffer = await DocumentController.generateDocument('sign_up_form', data);  // generate PDF
    let signUpFormDocument = await Document.create({
      name: 'sign_up_form', category: "secretary_files", type: 'generated',
      paperId: paper.id, mimeType: 'application/pdf', uploadedBy: null
    }, { transaction });

    fs.writeFileSync(getStoragePath(`${signUpFormDocument.id}.pdf`), signUpFormBuffer); // write to storage

    let statutoryDeclarationBuffer = await DocumentController.generateDocument('statutory_declaration', data);  // generate PDF
    let statutoryDeclarationDocument = await Document.create({
      name: 'statutory_declaration', category: "secretary_files", type: 'generated',
      paperId: paper.id, mimeType: 'application/pdf', uploadedBy: null
    }, { transaction });

    fs.writeFileSync(getStoragePath(`${statutoryDeclarationDocument.id}.pdf`), statutoryDeclarationBuffer); // write to storage

    let liquidationFormBuffer = await DocumentController.generateDocument('liquidation_form', data);  // generate PDF
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