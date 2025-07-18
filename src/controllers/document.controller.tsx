import React from "react";
import {
  Document, DocumentCategory, DocumentType, Paper, sequelize, SessionSettings,
  StudentExtraData, Domain, User, Student, Committee, Specialization, SignUpRequest, PaperAttributes,
  DocumentReuploadRequest,
  DocumentCreationAttributes
} from "../models/models";
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { Op, WhereOptions } from "sequelize";
import * as AuthController from "./auth.controller"
import { PaperRequiredDocument, paperRequiredDocuments } from '../paper-required-documents';
import { UploadedFile } from "express-fileupload";
import { arrayMap, compare, groupBy, inclusiveDate, parseDate, removeCharacters, ResponseError, ResponseErrorForbidden, ResponseErrorInternal, safePath, sortMembersByTitle, streamToBuffer, truncateInMiddle } from "../util/util";
import { config } from "../config/config";
import ExcelJS from 'exceljs';
import { redisHGet, redisHSet } from "../util/redis";
import { DOMAIN_TYPES, FUNDING_FORMS, PAPER_TYPES, STUDY_FORMS } from "../util/constants";
import { CommitteeCatalog as CommitteeCatalogWord, FinalCatalogWord } from "../util/word-templates";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import { SignUpForm } from "../documents/templates/sign-up-form";
import { StatutoryDeclaration } from "../documents/templates/statutory_declaration";
import { LiquidationForm } from "../documents/templates/liquidation-form";
import { StudentDocumentGenerationProps } from "../documents/types";
import { CommitteeCompositions } from "../documents/templates/committee-compositions";
import { CommitteeStudents } from "../documents/templates/committee-students";
import { CommitteeCatalog } from "../documents/templates/committee-catalog";
import { CommitteeFinalCatalog } from "../documents/templates/committee-final-catalog";
import { FinalCatalog } from "../documents/templates/final-catalog";
import { Logger } from "../util/logger";
import { LogName } from "../lib/types/enums/log-name.enum";
import archiver from "archiver";
import { SignaturesController } from "./signatures.controller";
import { mapPaper } from "./paper.controller";

Font.register({
  family: 'Liberation Serif',
  fonts: [
    { src: path.join(config.PROJECT_ROOT, 'src/documents/fonts/LiberationSerif-Regular.ttf') },
    { src: path.join(config.PROJECT_ROOT, 'src/documents/fonts/LiberationSerif-Bold.ttf'), fontWeight: 'bold' },
    { src: path.join(config.PROJECT_ROOT, 'src/documents/fonts/LiberationSerif-Italic.ttf'), fontStyle: 'italic' },
  ],
});

Font.registerHyphenationCallback(word => [word]);

export const getStoragePath = (fileName: string) => {
  return safePath(config.PROJECT_ROOT, 'storage', 'documents', fileName);
}

export const getTemplatePath = (docName: string) => {
  let fileName: string = docName + '.ejs';
  return path.resolve(process.env.PWD, 'src', 'templates', fileName);
}

/** Delete a document by ID. */
export const deleteDocument = async (user: User, documentId: number): Promise<boolean> => {
  const document = await Document.findOne({
    where: { id: documentId },
    include: [Document.associations.paper]
  });
  if (!document) {
    throw new ResponseError('Documentul nu există.', 'NOT_FOUND');
  }
  if(document.type == 'generated') {
    throw new ResponseErrorForbidden('Nu puteți șterge un document generat.');
  }
  if (document.uploadedBy != user.id) {
    if (user.type == 'teacher') {
      if (!paperRequiredDocuments.find(reqDoc => reqDoc.uploadBy == 'committee')) {
        throw new ResponseErrorForbidden();
      }
      const committee = await document.paper.getCommittee({ scope: 'min' });
      const isMember = committee.members.findIndex(member => member.user.id == user.id) >= 0;
      if (!isMember) {
        throw new ResponseErrorForbidden();
      }
    }
    if (user.type == 'student') {
      if (document.paper.studentId != user.id) {
        throw new ResponseErrorForbidden();
      }
    } else {
      throw new ResponseErrorForbidden();
    }
  }
  if (user.type != 'teacher' && document.paper.isValid != null) {
    throw new ResponseErrorForbidden();
  }
  // Check if document category can be modified
  if (
    user.type == 'student' && 
    !(await studentCanEditDocument({ name: document.name, category: document.category }, document.paperId))
  ) {
    throw new ResponseErrorForbidden('Nu suntem în perioada de trimitere de documente.', 'NOT_IN_FILE_SUBMISSION_PERIOD');
  }
  const transaction = await sequelize.transaction();
  try {
    await document.destroy({ transaction });
    await Logger.log(user, {
      name: LogName.DocumentDeleted,
      documentId: document.id,
      paperId: document.paperId,
    }, { transaction });
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
  return true;
}

export const getDocument = async (user: User, documentId: number) => {
  const document = await Document.findOne({
    where: { id: documentId },
    include: [{
      association: Document.associations.paper,
      required: true
    }],
    paranoid: user.type == 'admin' || user.type == 'secretary' ? false : true,
  });
  if (!document) {
    throw new ResponseError('Documentul nu există.', 'NOT_FOUND');
  }

  // Admin and student can view all documents, teacher can only view 'paper_files' category
  const canViewAsOwner = ['admin', 'secretary'].includes(user.type)
    || (user.type == 'student' && document.paper.studentId == user.student.id)
    || (user.type == 'teacher' && document.category == 'paper_files' && document.paper.teacherId == user.teacher.id)

  if (!canViewAsOwner) {
    // If user is not admin or owner of the paper, there is still a chance user's part of the committee reviewing the paper
    // committee members can only view 'paper_files'
    if (user.type == 'teacher' && document.category == 'paper_files') {
      let isInCommittee: boolean = (await user.teacher.getCommittees({
        include: [{
          model: Paper,
          required: true,
          where: {
            id: document.paper.id
          }
        }]
      })).length > 0;
      // If user is not in committee, it means they don't have access to the file
      if (!isInCommittee) {
        throw new ResponseErrorForbidden();
      }
    } else {
      throw new ResponseErrorForbidden();
    }
  }
  const extension = mime.extension(document.mimeType);
  try {
    let buffer = fs.readFileSync(getStoragePath(`${document.id}.${extension}`));
    return buffer;
  } catch (err) {
    console.log(err)
    throw new ResponseErrorInternal();
  }
}

export const getDocumentUploadHistory = async (paperId: number, documentName: string) => {
  const documents = await Document.findAll({
    where: {
      paperId,
      name: documentName,
    },
    include: [{ model: User.scope('min'), as: 'uploadedByUser' }],
    order: [['id', 'DESC']],
    paranoid: false,
  });
  return documents;
}

export async function generateSignUpForm(props: StudentDocumentGenerationProps) {
  return renderToBuffer(<SignUpForm {...props} />);
}

export async function generateStatutoryDeclaration(props: StudentDocumentGenerationProps) {
  return renderToBuffer(<StatutoryDeclaration {...props} />);
}

export async function generateLiquidationForm(props: StudentDocumentGenerationProps) {
  return renderToBuffer(<LiquidationForm {...props} />);
}

export async function studentCanEditDocument(document: Pick<PaperRequiredDocument, 'name' | 'category'>, paperId: number, sessionSettings?: SessionSettings) {
  async function getReuploadRequest() {
    let reuploadRequest = await DocumentReuploadRequest.findOne({
      where: { 
        paperId,
        documentName: document.name,
      },
      order: [['deadline', 'DESC']]
    });
    if(Date.now() > inclusiveDate(reuploadRequest?.deadline).getTime()) {
      reuploadRequest = null;
    }
    return reuploadRequest;
  }
  return await checkFileSubmissionPeriod(document.category, sessionSettings) || !!(await getReuploadRequest());
}

export async function checkPaperDocumentUploadRights(
  user: User, 
  name: string,
  type: DocumentType,
  paperId: number,
  documentFile?: UploadedFile,
) {
  const sessionSettings = await SessionSettings.findOne();

  // Uploading 'generated' documents is not allowed
  if (type == 'generated') {
    throw new ResponseErrorForbidden();
  }
  const paper = await Paper.findOne({ where: { id: paperId } });

  const requiredDocuments = await getPaperRequiredDocuments(paperId, sessionSettings);
  // We look for the document with the provided name
  const requiredDoc = requiredDocuments.find(doc => doc.name == name);
  // If there is no such document, we throw an error
  if (!requiredDoc) {
    throw new ResponseError('Document invalid.', 'INVALID_DOCUMENT');
  }
  // Check if the provided type matches the required document types
  if (!requiredDoc.types[type]) {
    throw new ResponseError('Tip document invalid.', 'INVALID_DOCUMENT_TYPE');
  }
  const acceptedMimeTypes = requiredDoc.acceptedMimeTypes.split(',');
  // For 'copy' documents, check if document mime type matches
  if (type == 'copy' && !acceptedMimeTypes.includes(documentFile?.mimetype)) {
    throw new ResponseError('MIME type-ul documentului este invalid.', 'INVALID_DOCUMENT_MIMETYPE');
  }
  // We allow admins and secretaries to upload any documents
  if(user.type !== 'admin' && user.type !== 'secretary') {
    if(requiredDoc.uploadBy === 'student') {
      if(user.type !== 'student' || paper.studentId !== user.id) {
        throw new ResponseErrorForbidden();
      }
      if(!(await studentCanEditDocument(requiredDoc, paperId, sessionSettings))) {
        throw new ResponseErrorForbidden('Nu suntem în perioada de trimitere de documente.', 'NOT_IN_FILE_SUBMISSION_PERIOD');
      }
    } else if(requiredDoc.uploadBy === 'teacher') {
      if(user.type !== 'teacher' || paper.teacherId !== user.id) {
        throw new ResponseErrorForbidden();
      }
    } else if(requiredDoc.uploadBy === 'committee') {
      if(user.type !== 'teacher') {
        throw new ResponseErrorForbidden();
      }
      const isInCommittee = (await user.teacher.getCommittees({
        include: [{
          model: Paper,
          required: true,
          where: {
            id: paperId,
          }
        }]
      })).length > 0;
      if(!isInCommittee) {
        throw new ResponseErrorForbidden('Nu faceți parte din comisia ce evaluează această lucrare.');
      }
    } else {
      throw new ResponseErrorForbidden();
    }

    const paperDocuments = await Document.findAll({ where: { name, paperId } }); // find all documents of name from paper
    // If the provided type is 'signed'
    if (type == 'signed') {
      // Check if a prior generated document exists
      if (paperDocuments.filter(doc => doc.type == 'generated').length == 0) {
        throw new ResponseErrorForbidden('Nu puteți încărca un semnat fără generat.', "MISSING_GENERATED_DOCUMENT");
      }
      // Check if the document is already signed
      if (paperDocuments.filter(doc => doc.type == 'signed').length > 0) {
        throw new ResponseErrorForbidden('Documentul este deja semnat.', "ALREADY_SIGNED");
      }
    }
    // If the provided type is 'copy', check if the document is already uploaded
    if (type == 'copy' && paperDocuments.filter(doc => doc.type == 'copy').length > 0) { 
      throw new ResponseErrorForbidden('Documentul este deja încărcat.', "ALREADY_UPLOADED");
    }
  }
  // If the paper is validated, the only allowed perspectives are 'teacher' (while grading hasn't started yet) and 'committee'
  if(
    paper.isValid !== null &&
    (
      (requiredDoc.uploadBy !== 'teacher' && requiredDoc.uploadBy !== 'committee') ||
      (requiredDoc.uploadBy === 'teacher' && sessionSettings.allowGrading && user.type !== 'admin' && user.type !== 'secretary')
    )
  ) {
    throw new ResponseErrorForbidden();
  }

  return { requiredDoc, paper };
}

async function createDocument(documentAttributes: DocumentCreationAttributes, content: Buffer, user?: User, isReupload = false) {
  const transaction = await sequelize.transaction();
  try {
    if(isReupload) {
      await Document.destroy({ 
        where: {
          name: documentAttributes.name,
          type: documentAttributes.type,
          paperId: documentAttributes.paperId,
        },
        transaction,
      });
    }
    const document = await Document.create(documentAttributes, { transaction });
    const fileExtension = mime.extension(documentAttributes.mimeType);
    fs.writeFileSync(getStoragePath(`${document.id}.${fileExtension}`), content);
    await Logger.log(user, {
      name: LogName.DocumentCreated,
      documentId: document.id,
      paperId: document.paperId,
    }, { transaction });
    await transaction.commit();
    return document;
  } catch(err) {
    await transaction.rollback();
  }
}

export async function uploadPaperDocument(
  user: User, 
  documentFile: UploadedFile,
  name: string,
  type: DocumentType,
  paperId: number
) {
  // Signing documents has moved to another endpoint
  if(type === 'signed') {
    throw new ResponseError('Nu puteți încărca un document semnat.');
  }
  const { requiredDoc: { category } } = await checkPaperDocumentUploadRights(user, name, type, paperId, documentFile);
  return createDocument(
    {
      name,
      type,
      mimeType: documentFile.mimetype,
      paperId,
      category,
      uploadedBy: user.id,
    },
    documentFile.data,
    user,
    user.type === 'admin' || user.type === 'secretary',
  );
}

export async function signPaperDocument(
  user: User, 
  name: string,
  paperId: number
) {
  const { requiredDoc: { category } } = await checkPaperDocumentUploadRights(user, name, 'signed', paperId);
  const paper = await Paper.scope(['student', 'teacher']).findByPk(paperId);
  const signature = await SignaturesController.findOneByUserId(paper.studentId);
  if(!signature) {
    throw new ResponseError("Înregistrați un specimen de semnătură înainte de a semna documente.");
  }
  const signatureSampleBuffer = await SignaturesController.getSample(signature.id);
  const signatureSample = `data:image/png;base64,${signatureSampleBuffer.toString('base64')}`;
  const student = await Student.findOne({
    where: { id: paper.studentId }, 
    include: [User, Domain, Specialization],
  });
  const generationProps: StudentDocumentGenerationProps = {
    student,
    extraData: await student.getStudentExtraDatum(),
    paper: mapPaper(paper),
    sessionSettings: await SessionSettings.findOne(),
    signatureSample,
  };
  let documentContent: Buffer;
  switch(name) {
    case 'sign_up_form':
      documentContent = await generateSignUpForm(generationProps);
      break;
    case 'statutory_declaration':
      documentContent = await generateStatutoryDeclaration(generationProps);
      break;
    case 'liquidation_form':
      documentContent = await generateLiquidationForm(generationProps);
      break;
    default:
      throw new ResponseError("Documentul nu poate fi semnat.", "INVALID_DOCUMENT_NAME");
  }

  return createDocument(
    {
      name,
      type: 'signed',
      mimeType: 'application/pdf',
      paperId,
      category,
      uploadedBy: user.id,
    },
    documentContent,
    user,
    user.type === 'admin' || user.type === 'secretary',
  );
}


export const getPaperRequiredDocuments = async (paperId: number, sessionSettings?: SessionSettings):
  Promise<PaperRequiredDocument[]> => {

  const cachedList = await redisHGet<PaperRequiredDocument[]>('paperRequiredDocs', paperId);
  if (cachedList) {
    return cachedList;
  }

  const paper = await Paper.findOne({
    include: [
      {
        association: Paper.associations.student,
        include: [
          StudentExtraData,
          Domain
        ]
      }
    ],
    where: { id: paperId }
  })

  if (!paper) { // if student has no paper
    throw new ResponseErrorForbidden();
  }

  if (!sessionSettings) { // if sessionSettings was not provided
    sessionSettings = await AuthController.getSessionSettings();
  }

  const result = paperRequiredDocuments.filter(doc => !doc.onlyFor || doc.onlyFor(paper, sessionSettings)).map(doc => {
    let sentDoc = { ...doc }
    delete sentDoc['onlyFor']; // remove the onlyFor attribute
    sentDoc.acceptedExtensions = doc.acceptedMimeTypes.split(',') // get accepted extensions from mimeType
      .map(mimeType => mime.extension(mimeType)).filter(t => t) as string[]; // remove not found mimeType extensions (false)
    return sentDoc;
  });
  redisHSet('paperRequiredDocs', paperId, result);
  return result;
}

export const checkFileSubmissionPeriod = async (category: DocumentCategory, sessionSettings?: SessionSettings) => {
  if (!sessionSettings) {
    sessionSettings = await SessionSettings.findOne();
  }
  if (sessionSettings == null) { // settings not set
    return false;
  }
  const today = Date.now();
  let startDate: number, endDate: number;
  if (category == 'secretary_files') {
    startDate = parseDate(sessionSettings.fileSubmissionStartDate).getTime();
    endDate = inclusiveDate(sessionSettings.fileSubmissionEndDate).getTime();
  } else if (category == 'paper_files') {
    startDate = parseDate(sessionSettings.fileSubmissionStartDate).getTime();
    endDate = inclusiveDate(sessionSettings.paperSubmissionEndDate).getTime();
  }
  return startDate <= today && today <= endDate;
}

/** [ promotion, studyForm, specialization ] */
type Group = [string, string, string];

/** Function used to check if two groups are equal. */
const equalGroups = (first: Group, second: Group) => {
  for (let i = 0; i < first.length; i++) {
    if (first[i] != second[i]) {
      return false;
    }
  }
  return true;
}

/** Checks if user is the president or the secretary of the committee. */
const checkCommitteeDocumentGenerationRight = (user: User, committee: Committee) => {
  let president = committee.members.find(member => member.committeeMember.role == 'president');
  let secretary = committee.members.find(member => member.committeeMember.role == 'secretary');
  if (president.id != user.teacher.id && secretary.id != user.teacher.id) {
    throw new ResponseErrorForbidden();
  }
  return true;
}

const getCommitteeForGeneration = (id: number) => {
  return Committee.findByPk(id, {
    include: [
      {
        model: Paper.scope(['teacher', 'grades']),
        include: [{
          association: Paper.associations.student,
          include: [
            User.scope('min'), StudentExtraData,
            Specialization, Domain
          ]
        }]
      }
    ]
  });
}

const getCommitteeCatalogData = async (user: User, committeId: number) => {
  const committee = await getCommitteeForGeneration(committeId);
  committee.members = sortMembersByTitle(committee.members);
  if (user.type == 'teacher') {
    checkCommitteeDocumentGenerationRight(user, committee);
  }
  let groupArr: Group[] = committee.papers.map(paper => {
    return [paper.student.promotion, paper.student.studyForm, paper.student.specialization.name];
  });
  // Get unique values of groupArr
  groupArr = groupArr.filter((firstGroup, i, arr) =>
    arr.findIndex(secondGroup => equalGroups(firstGroup, secondGroup)) == i);

  // For each group, get the corresponding papers
  let paperGroups = groupArr.map(group => {
    return committee.papers.filter(paper => {
      let paperGroup: Group = [paper.student.promotion, paper.student.studyForm, paper.student.specialization.name];
      return equalGroups(group, paperGroup);
    }).sort(paperComparator);
  });

  // Get session settings
  const sessionSettings = await SessionSettings.findOne();
  return { committee, paperGroups, sessionSettings };
}

export const generateCommitteeCatalog = async (user: User, committeId: number): Promise<Buffer> => {
  const { committee, paperGroups, sessionSettings } = await getCommitteeCatalogData(user, committeId);
  return renderToBuffer(
    <CommitteeCatalog committee={committee} paperGroups={paperGroups} sessionSettings={sessionSettings} />
  );
}

export const generateCommitteeCatalogWord = async (user: User, committeId: number) => {
  return CommitteeCatalogWord(await getCommitteeCatalogData(user, committeId));
};

export const generateCommitteeFinalCatalog = async (user: User, committeId: number): Promise<Buffer> => {
  const committee = await getCommitteeForGeneration(committeId);
  if (user.type == 'teacher') {
    checkCommitteeDocumentGenerationRight(user, committee);
  }
  let groupArr: Group[] = committee.papers.map(paper => {
    return [null, paper.student.studyForm, paper.student.specialization.name];
  });
  // Get unique values of groupArr
  groupArr = groupArr.filter((firstGroup, i, arr) =>
    arr.findIndex(secondGroup => equalGroups(firstGroup, secondGroup)) == i);

  // For each group, get the corresponding papers
  let paperGroups = groupArr.map(group => {
    return committee.papers.filter(paper => {
      let paperGroup: Group = [null, paper.student.studyForm, paper.student.specialization.name];
      return paper.gradeAverage != null && equalGroups(group, paperGroup);
    });
  }).filter(group => group.length > 0);

  // Group the previous results by promotion
  let paperPromotionGroups = paperGroups.map(paperGroup => {
    // Get unique promotions in group
    let promotions = new Set(paperGroup.map(paper => paper.student.promotion));
    let promotionItems: { promotion: string, items: Paper[] }[] = [];
    // For every promotion, get the papers
    promotions.forEach(promotion => {
      let result = {
        promotion,
        items: paperGroup.filter((paper => paper.student.promotion == promotion)).sort(paperComparator)
      };
      promotionItems.push(result);
    });
    return promotionItems;
  });

  // Get session settings
  const sessionSettings = await SessionSettings.findOne();
  return renderToBuffer(
    <CommitteeFinalCatalog committee={committee} paperPromotionGroups={paperPromotionGroups} sessionSettings={sessionSettings} />
  );
}

const getPaperFullName = (paper: Paper) => {
  const student = paper.student;
  return `${student.user.lastName} ${student.studentExtraDatum?.parentInitial} ${student.user.firstName}`;
}

const paperComparator = (a: Paper, b: Paper) => {
  return getPaperFullName(a) < getPaperFullName(b) ? -1 : 1;
}

export async function generateCommitteeCompositions() {
  const committees = await Committee.findAll();
  let uniqueDomains = new Set();
  // Group committees by domains
  committees.forEach(committee => {
    let domainIds = committee.domains.map(domain => domain.id).join('.');
    uniqueDomains.add(domainIds);
  });
  let groups: Committee[][] = [];
  uniqueDomains.forEach(domain => {
    let group = committees.filter(committee => committee.domains.map(domain => domain.id).join('.') == domain);
    groups.push(group);
  });
  const sessionSettings = await SessionSettings.findOne();
  return renderToBuffer(<CommitteeCompositions groups={groups} sessionSettings={sessionSettings} />);
}

async function _getCommitteStudentsData(committeeIds?: number[]) {
  const committees = await Committee.findAll({
    ...(committeeIds ? { where: { id: { [Op.in]: committeeIds } } } : {}),
    include: [{
      model: Paper.scope(['teacher', 'student']),
      include: [{
        association: Paper.associations.student,
        include: [Student.associations.domain]
      }]
    }]
  });
  sortCommittees(committees);
  return committees;
}

export async function generateCommitteeStudentsExcel(committeeIds?: number[]) {
  const committees = await _getCommitteStudentsData(committeeIds);
  const wb = new ExcelJS.Workbook();
  committees.forEach(committee => {
    let rows: [string, string, string, string, string, string][] = committee.papers.map(paper => {
      const scheduledGrading = paper.scheduledGrading?.toLocaleDateString('ro-RO', {
        timeZone: 'Europe/Bucharest',
        hour: '2-digit',
        minute: '2-digit',
      })?.replace(',', '') || '';
      const name = paper.student.user.fullName;
      const teacherName = paper.teacher.user.fullName;
      const title = paper.title;
      const domain = paper.student.domain.name;
      const email = paper.student.user.email;
      return [scheduledGrading, name, teacherName, title, domain, email];
    });
    if (rows.length == 0) {
      rows = [['', '', '', '', '', '']];
    }
    const name = removeCharacters(committee.name, ['/', '\\', '?', '*', ':', '[', ']']);
    const sheet = wb.addWorksheet(truncateInMiddle(name, 31));
    sheet.addTable({
      name: 'StudentTable' + committee.id,
      ref: 'A1',
      headerRow: true,
      columns: [
        { name: 'Programare' },
        { name: 'Nume și prenume' },
        { name: 'Profesor coordonator' },
        { name: 'Titlul lucrării' },
        { name: 'Domeniul' },
        { name: 'E-mail' }
      ],
      rows
    });
  });
  const buffer = (await wb.xlsx.writeBuffer());
  return buffer as Buffer;
}


export async function generateCommitteeStudents(committeeIds?: number[]) {
  const committees = await _getCommitteStudentsData(committeeIds);
  const sessionSettings = await SessionSettings.findOne();
  return renderToBuffer(<CommitteeStudents committees={committees} sessionSettings={sessionSettings} />);
}

const sortCommittees = (committees: Committee[]) => {
  return committees.sort((c1, c2) => {
    const d1Type = c1.domains[0].type;
    const d2Type = c2.domains[0].type;

    const nameAndNumber = (name: string): [string, number] => {
      const numberPart = (name.match(/\d+/) || '')[0];
      return [name.replace(numberPart, ''), parseInt(numberPart)];
    }

    const n1 = nameAndNumber(c1.name);
    const n2 = nameAndNumber(c2.name);

    return d1Type < d2Type ? -1 : (d1Type > d2Type ? 1 :
      n1[0] < n2[0] ? -1 : (n1[0] > n2[0] ? 1 : n1[1] <= n2[1] ? -1 : 1));
  });
}

export const generateFinalCatalog = async (mode: 'centralizing' | 'final', format: 'pdf' | 'docx' = 'pdf'): Promise<Buffer> => {
  let papers = await Paper.scope(['grades']).findAll({
    include: [{
      association: Paper.associations.student,
      include: [
        User.scope('min'),
        StudentExtraData,
        Specialization,
        Domain
      ]
    }],
    where: { committeeId: { [Op.ne]: null } }
  });

  if (mode == 'centralizing') {
    papers = papers.filter(paper => paper.gradeAverage && paper.gradeAverage >= 6);
  }

  let groupArr: Group[] = papers.map(paper => {
    return [null, paper.student.studyForm, paper.student.specialization.name];
  });
  // Get unique values of groupArr
  groupArr = groupArr.filter((firstGroup, i, arr) =>
    arr.findIndex(secondGroup => equalGroups(firstGroup, secondGroup)) == i);

  // For each group, get the corresponding papers
  let paperGroups = groupArr.map(group => {
    return papers.filter(paper => {
      let paperGroup: Group = [null, paper.student.studyForm, paper.student.specialization.name];
      return equalGroups(group, paperGroup);
    });
  }).filter(group => group.length > 0);

  // Group the previous results by promotion
  let paperPromotionGroups = paperGroups.map(paperGroup => {
    // Get unique promotions in group
    let promotions = new Set(paperGroup.map(paper => paper.student.promotion));
    let promotionItems: { promotion: string; items: Paper[] }[] = [];
    // For every promotion, get the papers
    promotions.forEach(promotion => {
      let result = {
        promotion,
        items: paperGroup.filter((paper => paper.student.promotion == promotion)).sort(paperComparator)
      };
      promotionItems.push(result);
    });
    return promotionItems.sort((a, b) => +b.promotion - +a.promotion);
  });

  // Get session settings
  const sessionSettings = await SessionSettings.findOne();
  if(format === 'pdf') {
    return renderToBuffer(
      <FinalCatalog mode={mode} paperPromotionGroups={paperPromotionGroups} sessionSettings={sessionSettings} />
    );
  } else if(format === 'docx') {
    return FinalCatalogWord({ mode, paperPromotionGroups, sessionSettings });
  }
}

export async function generatePaperList(where: WhereOptions<PaperAttributes> = { submitted: true }) {
  const papers = await Paper.scope(['teacher', 'student', 'committee']).findAll({
    where,
    include: [{
      association: Paper.associations.student,
      include: [
        Student.associations.domain,
        Student.associations.specialization,
        StudentExtraData
      ]
    }]
  });
  const wb = new ExcelJS.Workbook();
  let rows = papers.map(paper => {
    const id = paper.id;
    const studentName = paper.student.user.fullName;
    const parentInitial = paper.student.studentExtraDatum?.parentInitial || '';
    const teacherName = paper.teacher.user.fullName;
    const title = paper.title;
    const paperType = PAPER_TYPES[paper.type];
    const specialization = paper.student.specialization.name;
    const domain = paper.student.domain.name + ', ' + DOMAIN_TYPES[paper.student.domain.type];
    const committee = paper.committee?.name || '';
    const email = paper.student.user.email;
    const { matriculationYear, promotion } = paper.student;
    const paperValid = paper.isValid != null ? (paper.isValid ? 'Validată' : 'Invalidată') : 'N/A';
    const isSubmitted = paper.submitted ? 'Da' : 'Nu';
    return [
      id,
      studentName,
      parentInitial,
      teacherName,
      title,
      paperType,
      specialization,
      domain,
      committee,
      email,
      matriculationYear,
      promotion,
      paperValid,
      paper.student.generalAverage,
      isSubmitted
    ];
  });
  rows.sort((r1, r2) => compare(r1[6], r2[6], compare(r1[5], r2[5], compare(r1[1], r2[1]))));
  const groupedRows = [
    ['Toți studenții', rows],
    ...Object.entries(groupBy(rows, (row) => row[6]))
  ] as [string, typeof rows][];
  groupedRows.forEach(([groupName, rows], index) => {
    const sheet = wb.addWorksheet(groupName.substring(0, 31));
    sheet.addTable({
      name: 'StudentTable' + index,
      ref: 'A1',
      headerRow: true,
      columns: [
        { name: 'ID lucrare' },
        { name: 'Nume și prenume student' },
        { name: 'Inițiala părintelui' },
        { name: 'Profesor coordonator' },
        { name: 'Titlul lucrării' },
        { name: 'Tipul lucrării' },
        { name: 'Specializarea' },
        { name: 'Domeniul' },
        { name: 'Comisia' },
        { name: 'E-mail' },
        { name: 'Anul înmatriculării' },
        { name: 'Promoție' },
        { name: 'Lucrare validată' },
        { name: 'M.G. ani studiu' },
        { name: 'Lucrare înscrisă' }
      ],
      rows
    });
  });
  const buffer = (await wb.xlsx.writeBuffer());
  return buffer as Buffer;
}

export async function generateSignUpRequestExcel() {
  const requests = (await SignUpRequest.findAll({
    include: [{ model: Specialization, include: [Domain] }]
  })).sort((r1, r2) => compare(r1.specialization.domain.name, r2.specialization.domain.name,
    compare(r1.specialization.name, r2.specialization.name,
      compare(r1.group, r2.group,
        compare(r1.lastName, r2.lastName,
          compare(r1.firstName, r2.firstName))))));
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Cereri');
  sheet.addTable({
    name: 'Table1',
    ref: 'A1',
    headerRow: true,
    columns: [
      { name: 'ID' },
      { name: 'Nume și prenume' },
      { name: 'CNP' },
      { name: 'Număr matricol' },
      { name: 'An înmatriculare' },
      { name: 'Promoție' },
      { name: 'Domeniu' },
      { name: 'Specializare' },
      { name: 'Forma de învățământ' },
      { name: 'Grupă' },
      { name: 'Formă de finanțare' },
      { name: 'E-mail' },
    ],
    rows: requests.map(request => {
      const domain = request.specialization.domain;
      return [
        request.id,
        request.lastName + ' ' + request.firstName,
        request.CNP,
        request.identificationCode,
        request.matriculationYear,
        request.promotion,
        domain.name + ' ' + DOMAIN_TYPES[domain.type],
        request.specialization.name,
        STUDY_FORMS[request.studyForm],
        request.group,
        FUNDING_FORMS[request.fundingForm],
        request.email,
      ];
    })
  });
  const buffer = (await wb.xlsx.writeBuffer());
  return buffer as Buffer;
}

export async function generatePaperDocumentsArchive(paperIds: number[], documentNames: string[]) {
  const papers = await Paper.scope('student').findAll({
    where: { id: { [Op.in]: paperIds } },
    include: [
      { model: Document, where: { name: { [Op.in]: documentNames } } },
    ]
  });
  if(papers.flatMap(paper => paper.documents).length == 0) {
    throw new ResponseError('Nu există documente pentru lucrările selectate.', 'NO_DOCUMENTS');
  }
  const requiredDocumentsMap = arrayMap(paperRequiredDocuments, doc => doc.name);
  const archive = archiver('zip', {
    zlib: { level: config.COMPRESSION_LEVEL } 
  });
  papers.forEach(paper => {
    const documentSuffix = `${paper.student.user.fullName}, ${paper.title}`;
    const lastDocuments = paper.documents.reduce((acc, doc) => {
      acc[doc.name] = !acc[doc.name] || acc[doc.name].id < doc.id ? doc : acc[doc.name];
      return acc;
    }, {} as Record<string, Document>);
    Object.values(lastDocuments).forEach(document => {
      const requiredDoc = requiredDocumentsMap[document.name];
      const extension = mime.extension(document.mimeType);
      const buffer = fs.createReadStream(getStoragePath(`${document.id}.${extension}`));
      archive.append(buffer, { name: `${requiredDoc.title} - ${documentSuffix}.${extension}` });
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