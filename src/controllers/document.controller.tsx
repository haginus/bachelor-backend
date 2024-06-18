import React from "react";
import {
  Document, DocumentCategory, DocumentType, Paper, sequelize, SessionSettings,
  StudentExtraData, Domain, UploadPerspective, User, Student, Committee, Specialization, SignUpRequest, PaperAttributes
} from "../models/models";
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { Op, WhereOptions } from "sequelize";
import * as AuthController from "./auth.controller"
import { PaperRequiredDocument, paperRequiredDocuments } from '../paper-required-documents';
import { UploadedFile } from "express-fileupload";
import { compare, groupBy, inclusiveDate, parseDate, removeCharacters, ResponseError, ResponseErrorForbidden, ResponseErrorInternal, safePath, sortMembersByTitle, streamToBuffer, truncateInMiddle } from "../util/util";
import { config } from "../config/config";
import ExcelJS from 'exceljs';
import { redisHGet, redisHSet } from "../util/redis";
import { DOMAIN_TYPES, FUNDING_FORMS, PAPER_TYPES, STUDY_FORMS } from "../util/constants";
import { CommitteeCatalog as CommitteeCatalogWord } from "../util/word-templates";
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
    } if (user.type == 'student') {
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
  if (user.type == 'student' && !(await checkFileSubmissionPeriod(document.category))) {
    throw new ResponseErrorForbidden('Nu suntem în perioada de trimitere de documente.', 'NOT_IN_FILE_SUBMISSION_PERIOD');
  }

  try {
    const ext = mime.extension(document.mimeType);
    const documentPath = getStoragePath(`${documentId}.${ext}`);
    fs.unlinkSync(documentPath);
  } catch (err) {
    // pass
  }

  await document.destroy();
  return true;
}

export const getDocument = async (user: User, documentId: number) => {
  const document = await Document.findOne({
    where: { id: documentId },
    include: [{
      association: Document.associations.paper,
      required: true
    }]
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

export async function generateSignUpForm(props: StudentDocumentGenerationProps) {
  return renderToBuffer(<SignUpForm {...props} />);
}

export async function generateStatutoryDeclaration(props: StudentDocumentGenerationProps) {
  return renderToBuffer(<StatutoryDeclaration {...props} />);
}

export async function generateLiquidationForm(props: StudentDocumentGenerationProps) {
  return renderToBuffer(<LiquidationForm {...props} />);
}

export const uploadPaperDocument = async (user: User, documentFile: UploadedFile,
  name: string, type: DocumentType, perspective: UploadPerspective, paperId: number) => {

  const sessionSettings = await SessionSettings.findOne();

  if (type == 'generated') { // do not allow "uploading" generated files
    throw new ResponseErrorForbidden();
  }
  // Find the paper and check if it is valid
  const paper = await Paper.findOne({ where: { id: paperId } });
  if (paper.isValid != null) {
    // allow teachers to upload documents even if the paper is validated
    if (perspective == 'teacher') {
      if (sessionSettings.allowGrading) {
        throw new ResponseErrorForbidden();
      }
    } else if (perspective != 'committee') {
      throw new ResponseErrorForbidden();
    }
  }

  const requiredDocuments = await getPaperRequiredDocuments(paperId, sessionSettings);
  const mimeType = documentFile.mimetype; // get uploaded file mimeType
  const uploadedBy = user.id;
  const requiredDoc = requiredDocuments
    .find(doc => doc.name == name && (perspective == 'admin' || doc.uploadBy == perspective)); // find uploaded doc name in required list
  if (!requiredDoc) { // if it is not then throw error
    throw new ResponseError('Document invalid.', 'INVALID_DOCUMENT');
  }
  if (!requiredDoc.types[type]) { // check if uploaded doc type is required
    throw new ResponseError('Tip document invalid.', 'INVALID_DOCUMENT_TYPE');
  }
  const acceptedMimeTypes = requiredDoc.acceptedMimeTypes.split(','); // get accepted mimeTypes
  if (!acceptedMimeTypes.includes(mimeType)) { // check if uploaded doc mimeType is in the accepted array
    throw new ResponseError('MIME type-ul documentului este invalid.', 'INVALID_DOCUMENT_MIMETYPE');
  }

  const category = requiredDoc.category;

  // Check if document category can be uploaded
  if (perspective == 'student' && !(await checkFileSubmissionPeriod(category, sessionSettings))) {
    throw new ResponseErrorForbidden('Nu suntem în perioada de trimitere de documente.', 'NOT_IN_FILE_SUBMISSION_PERIOD');
  }

  const fileExtension = mime.extension(mimeType); // get the file extension

  const paperDocuments = await Document.findAll({ where: { name, paperId } }); // find all documents of name from paper

  const transaction = await sequelize.transaction(); // start a db transaction
  try {
    if (perspective == 'admin') {
      const oldDocuments = paperDocuments.filter(doc => doc.type == type);
      oldDocuments.forEach(doc => doc.destroy({ transaction }));
    } else {
      if (type == 'signed') { // if uploaded document type is signed
        if (paperDocuments.filter(doc => doc.type == 'generated').length == 0) { // check if generated document exists
          throw new ResponseErrorForbidden('Nu puteți încărca un semnat fără generat.', "MISSING_GENERATED_DOCUMENT");
        }
        if (paperDocuments.filter(doc => doc.type == 'signed').length > 0) { // check if not signed before
          throw new ResponseErrorForbidden('Documentul este deja semnat.', "ALREADY_SIGNED");
        }
      }
      if (type == 'copy') { // if uploaded document type is copy
        if (paperDocuments.filter(doc => doc.type == 'copy').length > 0) { // check if uploaded before
          throw new ResponseErrorForbidden('Documentul este deja încărcat.', "ALREADY_UPLOADED");
        }
      }
    }
    const newDocument = await Document.create({ name, type, mimeType, paperId, category, uploadedBy }, { transaction }); // create a new doc in db
    fs.writeFileSync(getStoragePath(`${newDocument.id}.${fileExtension}`), documentFile.data); // write doc to storage, throws error
    await transaction.commit(); // commit if everything is fine
    return newDocument;
  } catch (err) {
    console.log(err);
    await transaction.rollback(); // rollback if anything goes wrong
    throw err;
  }
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
  // Sort committes by domain type and name
  committees.sort((c1, c2) => {
    return (c1.domains[0].type == 'bachelor' && c2.domains[0].type == 'master') ? -1 :
      (c1.name < c2.name ? -1 : 1);
  });
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

export const generateCommitteeStudentsExcel = async () => {
  const committees = await Committee.findAll({
    include: [{
      model: Paper.scope(['teacher', 'student']),
      include: [{ // also include domains
        association: Paper.associations.student,
        include: [Student.associations.domain]
      }]
    }]
  });
  sortCommittees(committees);
  const wb = new ExcelJS.Workbook();
  committees.forEach(committee => {
    let rows: [string, string, string, string, string][] = committee.papers.map(paper => {
      const name = paper.student.user.fullName;
      const teacherName = paper.teacher.user.fullName;
      const title = paper.title;
      const domain = paper.student.domain.name;
      const email = paper.student.user.email;
      return [name, teacherName, title, domain, email];
    });
    if (rows.length == 0) {
      rows = [['', '', '', '', '']];
    }
    const name = removeCharacters(committee.name, ['/', '\\', '?', '*', ':', '[', ']']);
    const sheet = wb.addWorksheet(truncateInMiddle(name, 31));
    sheet.addTable({
      name: 'StudentTable' + committee.id,
      ref: 'A1',
      headerRow: true,
      columns: [
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


export async function generateCommitteeStudents() {
  const committees = await Committee.findAll({
    include: [{
      model: Paper.scope(['teacher', 'student']),
      include: [{ // also include domains
        association: Paper.associations.student,
        include: [Student.associations.domain]
      }]
    }]
  });
  sortCommittees(committees);
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

export const generateFinalCatalog = async (mode: 'centralizing' | 'final') => {
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
      return paper.gradeAverage != null && equalGroups(group, paperGroup);
    });
  }).filter(group => group.length > 0);

  // Group the previous results by promotion
  let paperPromotionGroups = paperGroups.map(paperGroup => {
    // Get unique promotions in group
    let promotions = new Set(paperGroup.map(paper => paper.student.promotion));
    let promotionItems = [];
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
    <FinalCatalog paperPromotionGroups={paperPromotionGroups} sessionSettings={sessionSettings} mode={mode} />
  );
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