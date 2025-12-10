import { Student, User, Domain, Specialization, ActivationToken, Teacher, Topic, Offer, SessionSettings, Committee, CommitteeMember, sequelize, Paper, Document, StudyForm, Application, Profile, PaperType, DomainType, StudentExtraData, DocumentType, PaperGrade, SignUpRequest, FundingForm, DocumentReuploadRequest, DocumentReuploadRequestCreationAttributes, CommitteeActivityDay, CommitteeActivityDayCreationAttributes, Log } from "../models/models";
import * as UserController from './user.controller';
import * as DocumentController from './document.controller';
import * as Mailer from '../mail/mailer';
import crypto from 'crypto';
import { Op, OrderItem, Sequelize, Transaction, ValidationError, WhereOptions } from "sequelize";
import csv from 'csv-parser';
import { PaperRequiredDocument } from "../paper-required-documents";
import { arrayMap, groupBy, makeNameClause, removeDiacritics, ResponseError, ResponseErrorForbidden, ResponseErrorInternal, ResponseErrorNotFound, sortMembersByTitle } from "../util/util";
import { autoAssignPapers } from "../util/assign-papers";
import fs from 'fs';
import { UploadedFile } from "express-fileupload";
import { redisDel, redisHSet } from "../util/redis";
import { Request } from "express";
import { resetPassword } from "./auth.controller";
import { StudentDocumentGenerationProps } from "../documents/types";
import { generatePaperDocuments, mapPaper } from "./paper.controller";
import { StudentController } from "./student.controller";
import { Logger } from "../util/logger";
import { LogName } from "../lib/types/enums/log-name.enum";
import { SignaturesController } from "./signatures.controller";
import { deepDiff } from "../util/deep-diff";
import { Literal } from "sequelize/types/utils";
var stream = require('stream');

interface Statistic {
  title: string;
  content: string | number;
  extra?: string,
  sectionPath?: string
}

export const getStats = async (): Promise<Statistic[]> => {
  const studentPromise = User.count({ where: { type: 'student' } });
  const validatedStudentPromise = User.count({ where: { type: 'student', validated: true } });
  const signUpRequestsPromise = SignUpRequest.count();
  const teacherPromise = User.count({ where: { type: 'teacher' } });
  const validatedTeacherPromise = User.count({ where: { type: 'teacher', validated: true } });
  const paperPromise = Paper.count({ where: { submitted: true } });
  const assignedPaperPromise = Paper.count({ col: 'committeeId' });
  const committeePromise = Committee.scope('min').findAll();
  const [studentCount, validatedStudentCount, signUpRequestsCount, teacherCount, validatedTeacherCount, paperCount, assignedPaperCount, committees] =
    await Promise.all([studentPromise, validatedStudentPromise, signUpRequestsPromise, teacherPromise, validatedTeacherPromise, paperPromise, assignedPaperPromise, committeePromise]);
  return [
    { title: 'Studenți', content: studentCount, extra: `din care ${validatedStudentCount} cu cont activ`, sectionPath: 'students' },
    { title: 'Profesori', content: teacherCount, extra: `din care ${validatedTeacherCount} cu cont activ`, sectionPath: 'teachers' },
    { title: 'Cereri de înregistrare', content: signUpRequestsCount, sectionPath: 'sign-up-requests' },
    { title: 'Lucrări', content: paperCount, extra: `din care ${assignedPaperCount} atribuite`, sectionPath: 'papers' },
    { title: 'Comisii', content: committees.length, sectionPath: 'committees' },
  ]
};

// Students

type SortOrder = 'ASC' | 'DESC';
type Pagination = { limit?: number, offset?: number };
export type StudentQueryFilters = {
  domainId: number;
  specializationId: number;
  group: number;
  promotion: number;
  email: string;
}

export const getStudents = async (sort, order, filter: StudentQueryFilters, page, pageSize) => {
  const limit = pageSize;
  const offset = page * pageSize;
  if (limit <= 0 || offset < 0) {
    throw "INVALID_PARAMETERS";
  }

  let sortArray: OrderItem = ['id', 'ASC']
  if (['id', 'firstName', 'lastName', 'CNP', 'email', 'group', 'domain', 'promotion']
    .includes(sort) && ['ASC', 'DESC'].includes(order)) {
    if (sort == 'group')
      sortArray = ['student', 'group', order];
    else if (sort == 'domain')
      sortArray = ['student', 'domain', 'name', order];
    else if (sort == 'promotion')
      sortArray = ['student', 'promotion', order];
    else
      sortArray = [sort, order];
  }

  const studentWhere = {};
  ['domainId', 'specializationId', 'group', 'promotion'].forEach(filterKey => {
    const value = filter[filterKey];
    if (value) {
      studentWhere[filterKey] = value;
    }
  });
  const userWhere = {};
  ['email', 'lastName', 'firstName'].forEach(filterKey => {
    const value = filter[filterKey];
    if (value) {
      userWhere[filterKey] = { [Op.substring]: value };
    }
  });

  let query = await User.findAndCountAll({
    where: userWhere,
    attributes: { exclude: ['password'] },
    include: [
      {
        model: sequelize.model('student'),
        required: true,
        where: studentWhere,
        include: [
          sequelize.model('domain'),
          sequelize.model('specialization')
        ]
      }],
    limit,
    offset,
    order: [sortArray]
  });
  return query;
}

/** Get student by user ID. */
export const getStudent = (id: number) => {
  return User.findOne({
    where: { id },
    attributes: { exclude: ['password'] },
    include: [{
      model: sequelize.model('student'),
      required: true,
      include: [
        sequelize.model('domain'),
        sequelize.model('specialization'),
        StudentExtraData,
      ]
    }]
  });
}

async function _checkUserEmail(email: string, existingUserId?: number, failIfExisting = true, transaction?: Transaction) {
  email = email.trim();
  const existingUsers = await User.findAll({ where: { email }, transaction });
  const existingUser = existingUsers.find(u => u.id === existingUserId);
  if (failIfExisting && existingUser && existingUser.id !== existingUserId) {
    throw new ResponseError("E-mailul introdus este deja luat.");
  }
  return existingUsers.find(u => !!u.password) || existingUsers[0];
}

export async function checkUserEmail(email: string) {
  return { existingId: (await _checkUserEmail(email, undefined, false))?.id || null };
}

export const addStudent = async (firstName: string, lastName: string, CNP: string, email: string, group: string, specializationId: number,
  identificationCode: string, promotion: string, studyForm: StudyForm, fundingForm: any, matriculationYear: string, merge = false, t?: Transaction, requestUser?: User) => {
  let specialization = await Specialization.findOne({ where: { id: specializationId } });
  if (!specialization) {
    throw "SPECIALIZATION_NOT_FOUND";
  }
  let domainId = specialization.domainId;
  let transaction = t || await sequelize.transaction();
  const userPayload = { firstName, lastName, CNP, email, type: 'student' as const };
  const studentPayload = { group, domainId, identificationCode, promotion, specializationId, studyForm, fundingForm, matriculationYear };
  try {
    email = email.trim();
    const existingUser = await _checkUserEmail(email, null, merge, transaction);
    let user = await User.create({ ...userPayload, password: existingUser?.password || null }, { transaction });
    await Student.create({ ...studentPayload, id: user.id, userId: user.id }, { transaction });
    await Profile.create({ userId: user.id }, { transaction });
    if(!existingUser) {
      let token = crypto.randomBytes(64).toString('hex'); // generate activation token
      let activationToken = await ActivationToken.create({ token, userId: user.id }, { transaction }); // insert in db
      await Mailer.sendWelcomeEmail(user, activationToken.token).catch(() => {
        throw new ResponseErrorInternal(
          'Studentul nu a putut fi creat deoarece serverul de e-mail este indisponibil. Contactați administratorul.',
          'EMAIL_NOT_SENT'
        );
      });
    }
    await Logger.log(requestUser, {
      name: LogName.UserCreated,
      userId: user.id,
      meta: {
        resultPayload: { ...studentPayload, user: userPayload },
      }
    }, { transaction });
    if (!t) {
      await transaction.commit();
      transaction = undefined;
    }
    return UserController.getUserData(user.id, transaction); // return user data
  } catch (err) {
    console.log(err)
    if (!t) await transaction.rollback(); // if anything goes wrong, rollback
    handleUserUpdateError(err);
  }
}

export const editStudent = async (id: number, firstName: string, lastName: string, CNP: string, email: string, group: string, specializationId: number,
  identificationCode: string, promotion: string, studyForm: StudyForm, fundingForm: FundingForm, matriculationYear: string, merge = false, requestUser?: User) => {
  let previousStudent = await Student.findOne({ where: { userId: id }, include: [User, StudentExtraData] });
  if (!previousStudent) {
    throw new ResponseErrorNotFound('Studentul nu a fost găsit.');
  }
  let specialization = await Specialization.findOne({ where: { id: specializationId } });
  if (!specialization) {
    throw new ResponseError('Specializarea nu există.', 'SPECIALIZATION_NOT_FOUND');
  }
  let domainId = specialization.domainId;
  let documentsGenerated = false;
  const transaction = await sequelize.transaction();
  try {
    email = email.trim();
    const existingUser = await _checkUserEmail(email, id, merge, transaction);
    const userPayload = { firstName, lastName, CNP, email };
    const studentPayload = { group, domainId, identificationCode, promotion, specializationId, studyForm, fundingForm, matriculationYear };
    const [userUpdateCount] = await User.update(userPayload, { where: { id }, transaction });
    const [studentUpdateCount] = await Student.update(studentPayload, { where: { userId: id }, transaction });
    if (previousStudent.user.email != email) {
      if(merge && existingUser && existingUser.id !== id) {
        await User.update({ password: null }, { where: { id }, transaction });
      } else {
        await resetPassword(email, transaction);
      }
    }
    const resultPayload = { ...studentPayload, user: userPayload };
    await Logger.log(requestUser, {
      name: LogName.UserUpdated,
      userId: id,
      meta: {
        changedProperties: deepDiff(resultPayload, previousStudent),
        resultPayload,
      }
    }, { transaction });
    if ((userUpdateCount || studentUpdateCount) && previousStudent.studentExtraDatum) {
      const paper = await Paper.scope(['student', 'teacher']).findOne({
        where: { studentId: previousStudent.id },
      });
      if (paper) {
        if (paper.isValid === true) {
          throw new ResponseError('Studentul nu poate fi editat deoarece lucrarea acestuia a fost validată.', 'PAPER_ALREADY_VALIDATED');
        }
        const sessionSettings = await SessionSettings.findOne();
        redisHSet('paperRequiredDocs', paper.id, null);
        const generatedDocuments = await generatePaperDocuments(mapPaper(paper), previousStudent.studentExtraDatum, sessionSettings, transaction);
        documentsGenerated = generatedDocuments.length > 0;
      }
    }
    await transaction.commit();
    return {
      user: await UserController.getUserData(id),
      documentsGenerated,
    }
  } catch (err) {
    console.log(err);
    await transaction.rollback(); // if anything goes wrong, rollback
    handleUserUpdateError(err);
  }
}

export async function editStudentExtraData(studentId: number, data: StudentExtraData, requestUser: User) {
  const studentUser = await getStudent(studentId);
  if (!studentUser) {
    throw new ResponseErrorNotFound('Studentul nu a fost găsit.');
  }
  return StudentController.setExtraData(studentUser, data, true, requestUser);
}

export const deleteUser = async (request: Request, id: number) => {
  const requestUser = request._user;
  const user = await User.findByPk(id);
  if (requestUser.id == id) {
    throw new ResponseErrorForbidden('Nu puteți șterge contul propriu.');
  }
  if (requestUser.type == 'secretary' && !['student'].includes(user.type)) {
    throw new ResponseErrorForbidden('Nu aveți permisiunea să ștergeți acest tip de utilizator.');
  }
  if (['admin', 'secretary'].includes(user.type) && !request._sudo) {
    throw new ResponseErrorForbidden('Trebuie să vă autentificați cu parola pentru a putea șterge acest tip de utilizator.');
  }
  const transaction = await sequelize.transaction();
  try {
    let result = await User.destroy({ where: { id }, transaction });
    if (user.type === 'student') {
      await Student.destroy({ where: { id }, transaction });
      await Paper.destroy({ where: { studentId: id }, transaction });
    }
    await Logger.log(requestUser, {
      name: LogName.UserDeleted,
      userId: id,
    }, { transaction });
    await transaction.commit();
    return result;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export const addStudentBulk = async (file: Buffer, specializationId: number, studyForm: StudyForm, requestUser?: User) => {
  const specialization = await Specialization.findByPk(specializationId);
  if (!specialization) {
    throw new ResponseError('Specializarea nu a fost găsită.', 'SPECIALIZATION_NOT_FOUND');
  }
  let users = [];
  const HEADERS = [
    ['NUME', 'lastName'],
    ['PRENUME', 'firstName'],
    ['CNP', 'CNP'],
    ['EMAIL', 'email'],
    ['GRUPA', 'group'],
    ['NUMAR_MATRICOL', 'identificationCode'],
    ['PROMOTIE', 'promotion'],
    ['FORMA_FINANTARE', 'fundingForm'],
    ['AN_INMATRICULARE', 'matriculationYear']
  ];
  let headerLength = 0;
  await new Promise((resolve, reject) => {
    var bufferStream = new stream.PassThrough();
    bufferStream.end(file);
    bufferStream
      .pipe(csv({
        mapHeaders: ({ header, index }) => {
          const expectedHeader = HEADERS[index] && HEADERS[index][0];
          if (header != expectedHeader) {
            reject(new ResponseError(`Eroare pe coloana ${index + 1}: se aștepta ` +
              `"${expectedHeader}", dar s-a citit "${header}".`));
          }
          headerLength++;
          return HEADERS[index] && HEADERS[index][1];
        }
      }))
      .on('data', (data) => users.push(data))
      .on('end', () => {
        if (headerLength != HEADERS.length) {
          reject(new ResponseError("Lungimea antetului nu coincide cu cea așteptată."));
        }
        resolve(null);
      });
  });
  let promises = users.map(async user => {
    user.fundingForm = removeDiacritics((user.fundingForm || '').trim().toLowerCase());
    if (user.fundingForm == 'buget') {
      user.fundingForm = 'budget';
    } else if (user.fundingForm == 'taxa') {
      user.fundingForm = 'tax';
    } else {
      throw new ResponseError('Câmpul "formă de finanțare" trebuie să fie buget/taxă.');
    }
    user.email = user.email.trim();
    user.CNP = user.CNP.trim();
    user.firstName = user.firstName.trim();
    user.lastName = user.lastName.trim();
    user.group = user.group.trim();
    user.identificationCode = user.identificationCode.trim();
    user.promotion = user.promotion.trim();
    user.matriculationYear = user.matriculationYear.trim();
    const existing = await User.findOne({ where: { email: user.email }, include: [Student] });
    if (existing && !existing.student) {
      throw new ResponseError("E-mailul introdus este luat, însă nu de un student.");
    }
    if (existing && existing.student.specializationId == specializationId) return {
      status: 'edited' as const,
      row: user,
      result: await editStudent(existing.id, user.firstName, user.lastName, user.CNP, user.email, user.group, specializationId, user.identificationCode, user.promotion, studyForm, user.fundingForm, user.matriculationYear, false, requestUser)
    }
    return {
      status: 'added' as const,
      row: user,
      result: await addStudent(user.firstName, user.lastName, user.CNP, user.email, user.group, specializationId, user.identificationCode, user.promotion, studyForm, user.fundingForm, user.matriculationYear, false, undefined, requestUser)
    }
  });

  let results: PromiseSettledResult<{ status: 'added' | 'edited'; row: any; result: any; }>[] = [];
  for(const promise of promises) {
    const [result] = await Promise.allSettled([promise]);
    results.push(result);
  }

  return {
    stats: {
      totalRows: users.length,
      addedRows: results.filter(result => result.status == 'fulfilled' && result.value.status == 'added').length,
      editedRows: results.filter(result => result.status == 'fulfilled' && result.value.status == 'edited').length,
      invalidRows: results.filter(result => result.status == 'rejected').length
    },
    rows: results.map((result, index) => {
      if (result.status == 'fulfilled') {
        return {
          rowIndex: index + 1,
          ...result.value,
        }
      } else {
        return {
          rowIndex: index + 1,
          status: 'error',
          row: users[index],
          error: result.reason.message || result.reason,
        }
      }
    })
  }
}

// Teachers
export type TeacherQueryFilters = {
  lastName?: number;
  firstName?: number;
  email?: string;
  onlyMissingReports?: boolean;
}

export const getTeachers = async (sort: string, order: 'ASC' | 'DESC', filter: TeacherQueryFilters = {}, page: number, pageSize: number) => {
  const limit = pageSize || 10;
  const offset = page * pageSize || 0;
  if (limit <= 0 || offset < 0) {
    throw "INVALID_PARAMETERS";
  }

  let sortArray: OrderItem = ['id', 'ASC'];
  if (['id', 'firstName', 'lastName', 'CNP', 'email'].includes(sort) && ['ASC', 'DESC'].includes(order)) {
    sortArray = [sort, order];
  } else if (['offerCount', 'paperCount', 'submittedPaperCount', 'plagiarismReportCount'].includes(sort) && ['ASC', 'DESC'].includes(order)) {
    if(sort === 'plagiarismReportCount') {
      sortArray = [Sequelize.literal(`\`teacher.submittedPaperCount\` - \`teacher.plagiarismReportCount\``), order];
    } else {
      sortArray = [Sequelize.literal(`\`teacher.${sort}\``), order];
    }
  }

  const paperLiteral = Sequelize.literal(`(
    SELECT COUNT(*)
    FROM papers AS paper
    WHERE paper.teacherId = \`teacher\`.id
    AND deletedAt IS null
  )`);

  const submittedPaperLiteral = Sequelize.literal(`(
    SELECT COUNT(*)
    FROM papers AS paper
    WHERE paper.teacherId = \`teacher\`.id
    AND paper.submitted = 1
    AND deletedAt IS null
  )`);

  const plagiarismReportLiteral = Sequelize.literal(`(
    SELECT COUNT(*)
    FROM papers AS paper, documents AS document
    WHERE paper.teacherId = \`teacher\`.id
    AND document.paperId = paper.id
    AND paper.submitted = 1
    AND document.name = 'plagiarism_report'
    AND paper.deletedAt IS null
    AND document.deletedAt IS null
  )`);

  const offerLiteral = Sequelize.literal(`(
    SELECT COUNT(*)
    FROM offers AS offer
    WHERE offer.teacherId = \`teacher\`.id
  )`);

  let userWhere: WhereOptions<User> = { type: 'teacher' }, teacherWhere: Literal;
  ['email', 'lastName', 'firstName'].forEach(filterKey => {
    const value = filter[filterKey];
    if (value) {
      userWhere[filterKey] = { [Op.substring]: value };
    }
  });
  if(filter.onlyMissingReports) {
    teacherWhere = Sequelize.literal(`(
      ${submittedPaperLiteral.val} > ${plagiarismReportLiteral.val}
    )`);
  }

  let query = await User.findAndCountAll({
    where: userWhere,
    include: [
      {
        association: User.associations.teacher,
        where: teacherWhere,
        attributes: {
          include: [
            [paperLiteral, 'paperCount'],
            [submittedPaperLiteral, 'submittedPaperCount'],
            [plagiarismReportLiteral, 'plagiarismReportCount'],
            [offerLiteral, 'offerCount']
          ]
        }
      }
    ],
    attributes: { exclude: ['password'] },
    limit,
    offset,
    order: [sortArray]
  });
  return query;
}

export const addTeacher = async (title: string, firstName: string, lastName: string, CNP: string, email: string, requestUser?: User) => {
  const transaction = await sequelize.transaction();
  const userPayload = { title, firstName, lastName, CNP, email, type: 'teacher' as const };
  const teacherPayload = {};
  try {
    email = email.trim();
    await _checkUserEmail(email, null, true, transaction);
    let user = await User.create(userPayload, { transaction });
    await Teacher.create({ ...teacherPayload, id: user.id, userId: user.id }, { transaction });
    await Profile.create({ userId: user.id }, { transaction });
    let token = crypto.randomBytes(64).toString('hex');
    let activationToken = await ActivationToken.create({ token, userId: user.id }, { transaction });
    try {
      await Mailer.sendWelcomeEmail(user, activationToken.token); // send welcome mail
    } catch (err) {
      throw new ResponseErrorInternal(
        'Profesorul nu a putut fi creat deoarece serverul de e-mail este indisponibil. Contactați administratorul.',
        'EMAIL_NOT_SENT'
      );
    }
    await Logger.log(requestUser, {
      name: LogName.UserCreated,
      userId: user.id,
      meta: {
        resultPayload: { ...teacherPayload, user: userPayload },
      }
    }, { transaction });
    await transaction.commit();
    return UserController.getUserData(user.id);
  } catch (err) {
    await transaction.rollback();
    handleUserUpdateError(err);
  }
}

export const editTeacher = async (id: number, title: string, firstName: string, lastName: string, CNP: string, email: string, requestUser?: User) => {
  const transaction = await sequelize.transaction();
  let previousTeacher = await Teacher.findOne({ where: { userId: id }, include: [User] });
  if (!previousTeacher) {
    throw new ResponseErrorNotFound('Profesorul nu a fost găsit.');
  }
  const userPayload = { title, firstName, lastName, CNP, email };
  try {
    email = email.trim();
    await _checkUserEmail(email, id, true, transaction);
    await User.update(userPayload, { where: { id }, transaction });
    if (previousTeacher.user.email != email) {
      await resetPassword(email, transaction);
    }
    const resultPayload = { user: userPayload };
    await Logger.log(requestUser, {
      name: LogName.UserUpdated,
      userId: id,
      meta: {
        changedProperties: deepDiff(resultPayload, previousTeacher),
        resultPayload,
      }
    }, { transaction });
    await transaction.commit();
    return UserController.getUserData(id);
  } catch (err) {
    await transaction.rollback();
    handleUserUpdateError(err);
  }
}

export const addTeacherBulk = async (file: Buffer, requestUser?: User) => {
  const HEADERS = [
    ['TITLU', 'title'],
    ['NUME', 'lastName'],
    ['PRENUME', 'firstName'],
    ['CNP', 'CNP'],
    ['EMAIL', 'email'],
  ];
  let users = [];
  let headerLength = 0;
  await new Promise((resolve, reject) => {
    let bufferStream = new stream.PassThrough();
    bufferStream.end(file);
    bufferStream
      .pipe(csv({
        mapHeaders: ({ header, index }) => {
          const expectedHeader = HEADERS[index] && HEADERS[index][0];
          if (header != expectedHeader) {
            reject(new ResponseError(`Eroare pe coloana ${index + 1}: se aștepta ` +
              `"${expectedHeader}", dar s-a citit "${header}".`));
          }
          headerLength++;
          return HEADERS[index] && HEADERS[index][1];
        }
      }))
      .on('data', (data) => users.push(data))
      .on('end', () => {
        if (headerLength != HEADERS.length) {
          reject(new ResponseError("Lungimea antetului nu coincide cu cea așteptată."));
        }
        resolve(null);
      });
  });

  let promises = users.map(user => {
    const { title, firstName, lastName, CNP, email } = user;
    return addTeacher(title, firstName, lastName, CNP, email, requestUser);
  });

  let results = await Promise.allSettled(promises);
  let totalTeachers = users.length;
  let response = { teachers: [], totalTeachers, addedTeachers: 0 };

  results.forEach(result => {
    if (result.status == 'fulfilled') {
      response.addedTeachers++;
      response.teachers.push(result.value);
    }
  });

  return response;
}

function handleUserUpdateError(err: unknown) {
  if (err instanceof ValidationError) {
    if (err.errors[0].validatorKey == 'not_unique') {
      throw new ResponseError('E-mailul introdus este deja luat.', 'VALIDATION_ERROR');
    }
    throw new ResponseError('Datele introduse sunt incorecte.', 'VALIDATION_ERROR');
  }
  throw err;
}

export const resendUserActivationCode = async (userId: number) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new ResponseError("Utilizatorul nu există.");
  }
  const [activationToken, _] = await ActivationToken.findOrCreate({ where: { userId } });
  await Mailer.sendWelcomeEmail(user, activationToken.token);
  return true;
}

// Admins

export const getAdmins = async () => {
  return User.findAll({
    where: {
      type: {
        [Op.or]: ['admin', 'secretary']
      }
    },
  });
}

export const addAdmin = async (firstName: string, lastName: string, email: string, type: 'admin' | 'secretary', requestUser?: User) => {
  if (['admin', 'secretary'].indexOf(type) == -1) {
    throw new ResponseError('Tipul de utilizator nu este valid.', 'VALIDATION_ERROR');
  }
  const userPayload = { firstName, lastName, email, type };
  const transaction = await sequelize.transaction();
  try {
    let user = await User.create(userPayload, { transaction });
    await Profile.create({ userId: user.id }, { transaction });
    let token = crypto.randomBytes(64).toString('hex');
    let activationToken = await ActivationToken.create({ token, userId: user.id }, { transaction });
    try {
      await Mailer.sendWelcomeEmail(user, activationToken.token); // send welcome mail
    } catch (err) {
      throw new ResponseErrorInternal(
        'Contul nu a putut fi creat deoarece serverul de e-mail este indisponibil. Contactați administratorul.',
        'EMAIL_NOT_SENT'
      );
    }
    await Logger.log(requestUser, {
      name: LogName.UserCreated,
      userId: user.id,
      meta: {
        resultPayload: userPayload,
      }
    }, { transaction });
    await transaction.commit();
    return UserController.getUserData(user.id);
  } catch (err) {
    await transaction.rollback();
    if (err instanceof ValidationError) {
      if (err.errors[0].validatorKey == 'not_unique') {
        throw new ResponseError('E-mailul introdus este deja luat.', 'VALIDATION_ERROR');
      }
      throw new ResponseError('Datele introduse sunt incorecte.', 'VALIDATION_ERROR');
    }
    throw err;
  }
}

export const editAdmin = async (id: number, firstName: string, lastName: string, type: 'admin' | 'secretary', requestUser?: User) => {
  if (['admin', 'secretary'].indexOf(type) == -1) {
    throw new ResponseError('Tipul de utilizator nu este valid.', 'VALIDATION_ERROR');
  }
  const previousAdmin = await User.findOne({ where: { id } });
  const userPayload = { firstName, lastName, type };
  const transaction = await sequelize.transaction();
  try {
    await User.update(userPayload, { where: { id }, transaction });
    await Logger.log(requestUser, {
      name: LogName.UserUpdated,
      userId: id,
      meta: {
        changedProperties: deepDiff(userPayload, previousAdmin),
        resultPayload: userPayload,
      }
    }, { transaction });
    await transaction.commit();
    return UserController.getUserData(id);
  } catch(err) {
    await transaction.rollback();
    throw err;
  }
}

// Requests
export const getSignUpRequests = async () => {
  return SignUpRequest.findAll();
}

export const acceptSignUpRequest = async (id: number, additionalChanges: SignUpRequest & { generalAverage?: number }, requestUser?: User) => {
  let request = await SignUpRequest.findByPk(id);
  if (!request) {
    throw new ResponseError('Cererea nu există.');
  }
  const transaction = await sequelize.transaction();
  try {
    await request.update({ ...additionalChanges }, { transaction });
    const student = await addStudent(request.firstName, request.lastName, request.CNP, request.email, request.group, request.specializationId,
      request.identificationCode, request.promotion, request.studyForm, request.fundingForm, request.matriculationYear, false,
      transaction, requestUser);
    if (additionalChanges.generalAverage) {
      await Student.update({ generalAverage: additionalChanges.generalAverage }, { where: { id: student.id }, transaction });
    }
    await SignUpRequest.destroy({ where: { id }, transaction });
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
  return true;
}

export const declineSignUpRequest = async (id: number) => {
  let request = await SignUpRequest.findByPk(id);
  if (!request) {
    throw new ResponseError('Cererea nu există.');
  }
  await SignUpRequest.destroy({ where: { id } });
  return true;
}

export const getDomains = () => {
  return Domain.scope("specializations").findAll();
}

export const getDomainsExtra = () => {
  return Domain.scope("specializations").findAll({
    attributes: {
      include: [
        [literals.DOMAIN_STUDENT_NUMBER, 'studentNumber'],
        [literals.DOMAIN_OFFER_NUMBER, 'offerNumber']
      ]
    }
  })
}

export const getDomain = (id) => {
  return Domain.scope("specializations").findOne({
    attributes: {
      include: [
        [literals.DOMAIN_STUDENT_NUMBER, 'studentNumber'],
        [literals.DOMAIN_OFFER_NUMBER, 'offerNumber']
      ]
    },
    where: { id }
  })
}

const ckeckDomainPaperTypes = (domain: DomainType, paperType: PaperType) => {
  if (paperType == null) {
    throw new ResponseError("Tip de lucrare incompatibil.");
  }
  if (domain == 'bachelor') {
    if (!['bachelor', 'diploma'].includes(paperType)) {
      throw new ResponseError("Tip de lucrare incompatibil.");
    }
  } else if (domain == 'master') {
    if (paperType != 'master') {
      throw new ResponseError("Tip de lucrare incompatibil.");
    }
  }
}

export const addDomain = (name: string, type: DomainType, paperType: PaperType, specializations: Specialization[]) => {
  ckeckDomainPaperTypes(type, paperType);
  return Domain.create(
    { name, type, paperType, specializations },
    {
      include: [sequelize.model('specialization')]
    }
  );
}

export const editDomain = async (id: string, name: string, type: DomainType, paperType: PaperType, specializations) => {
  ckeckDomainPaperTypes(type, paperType);
  const oldDomain = await getDomain(id); // get old domain data
  if (!oldDomain) {
    throw "BAD_REQUEST";
  }
  const specIds = oldDomain.specializations.map(spec => spec.id);
  const transaction = await sequelize.transaction(); // start transaction
  try {
    await Domain.update({ name, type, paperType }, { where: { id }, transaction }); // update domain data
    let specs = {
      toAdd: specializations.filter(spec => !spec.id), // specs that do not have an id will be added,
      toEdit: specializations.filter(spec => specIds.includes(spec.id)), // specs that have ids in specIds
      toDelete: specIds.filter(specId => !specializations.map(spec => spec.id).includes(specId)) // specs int specIds but not in the new array
    }
    if (specs.toAdd.length > 0) {
      specs.toAdd = specs.toAdd.map(spec => {
        return { name: spec.name, studyYears: spec.studyYears, domainId: oldDomain.id } // add domainId
      });
      await Specialization.bulkCreate(specs.toAdd, { transaction });
    }
    for (let spec of specs.toEdit) {
      await Specialization.update({ name: spec.name, studyYears: spec.studyYears }, { where: { id: spec.id }, transaction });
    }
    if (specs.toDelete.length > 0) {
      specs.toDelete.forEach(specId => { // check if deleted specs have students
        let spec = oldDomain.specializations.find(spec => spec.id == specId);
        if (spec?.studentNumber > 0) {
          throw "NOT_ALLOWED"
        }
      });
      await Specialization.destroy({
        where: {
          id: {
            [Op.in]: specs.toDelete
          }
        }, transaction
      });
    }
    await transaction.commit();
  } catch (err) {
    console.log(err)
    await transaction.rollback();
    throw "BAD_REQUEST";
  }
  return getDomain(id);
}

export const deleteDomain = async (id) => {
  const domain = await getDomain(id);
  if (!domain || domain.studentNumber > 0) {
    throw "BAD_REQUEST";
  }
  return Domain.destroy({ where: { id } });
}

// TOPICS

export const getTopics = async (sort, order, filter, page, pageSize) => {
  const limit = pageSize;
  const offset = page * pageSize;
  if (limit <= 0 || offset < 0) {
    throw "INVALID_PARAMETERS";
  }

  let sortArray: OrderItem = ['id', 'ASC']
  if (['id', 'name'].includes(sort) && ['ASC', 'DESC'].includes(order)) {
    sortArray = [sort, order];
  }

  let query = await Topic.findAndCountAll({
    limit,
    offset,
    order: [sortArray]
  });
  return query;
}

export const addTopic = (name) => {
  return Topic.create({ name });
}

export const editTopic = (id, name) => {
  return Topic.update({ name }, { where: { id } });
}

export const deleteTopic = async (id: number, moveId: number, transaction?: Transaction) => {
  if (id == moveId) {
    throw new ResponseError("Nu puteți muta ofertele și lucrările în aceeași temă. ", "SAME_IDS", 401);
  }

  const moveTopic = await Topic.findOne({ where: { id: moveId } });
  if (!moveTopic) {
    throw new ResponseError("Tema pentru mutare nu există", "BAD_MOVE_ID", 401);
  }
  let isExternalTransaction = false;
  if (transaction) {
    isExternalTransaction = true;
  } else {
    transaction = await sequelize.transaction();
  }
  try {
    // Update offer and paper topics in bulk using manual SQL query since sequelize doen't have this feature
    // First we need to get the offers and papers that have the moveId already (we will exclude them)
    // Pay attention to escapes since not having them can cause SQL injections!!!
    let [results, _] = await sequelize.query(`SELECT offerId FROM OfferTopics WHERE topicId = ${sequelize.escape(moveId)};`, { transaction });
    let excludedOfferIds = results.map(result => (result as any).offerId).join(',') || 0;
    await sequelize.query(
      `
        UPDATE OfferTopics SET topicId = ${sequelize.escape(moveId)}
        WHERE topicId = ${sequelize.escape(id)}
        AND offerId NOT IN (${excludedOfferIds});
      `,
      { transaction }
    );
    [results, _] = await sequelize.query(`SELECT paperId FROM paperTopics WHERE topicId = ${sequelize.escape(moveId)};`, { transaction });
    let excludedPaperIds = results.map(result => (result as any).paperId).join(',') || 0;
    await sequelize.query(
      `
        UPDATE paperTopics SET topicId = ${sequelize.escape(moveId)}
        WHERE topicId = ${sequelize.escape(id)}
        AND paperId NOT IN (${excludedPaperIds});
      `,
      { transaction }
    );
    await Topic.destroy({ where: { id }, transaction });
    if (!isExternalTransaction) {
      await transaction.commit();
    }
    return { success: true }
  } catch (err) {
    console.log(err)
    if (!isExternalTransaction) {
      await transaction.rollback();
    }
    throw new ResponseError("A apărut o eroare. Contactați administratorul.", "INTERNAL_ERROR", 501)
  }
}

export const bulkDeleteTopics = async (ids: number[], moveId: number) => {
  const transaction = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED
  });
  try {
    for (let i = 0; i < ids.length; i++) {
      await deleteTopic(ids[i], moveId, transaction);
    }
    await transaction.commit();
    return { success: true };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

// COMMITTEES

export const getCommittees = async () => {
  let committees = await Committee.findAll();
  return JSON.parse(JSON.stringify(committees)).map(committee => {
    committee.members = committee.members.map(member => {
      member.teacherId = member.id
      member.role = member.committeeMember.role;
      return member;
    })
    committee.members = sortMembersByTitle(committee.members);
    return committee;
  });
}

// Get Committee by ID
export const getCommittee = async (id: number) => {
  let committee = await Committee.findOne({ where: { id } });
  if (!committee) {
    return null;
  }
  let resp: any = JSON.parse(JSON.stringify(committee));
  resp.members = resp.members.map(member => {
    let parsedMember: any = { ...member }
    parsedMember.teacherId = member.id
    parsedMember.role = member.committeeMember.role;
    return parsedMember;
  });
  resp.members = sortMembersByTitle(resp.members);
  return resp;
}

// Helper function to check whether the committee is well defined
const checkCommitteeComponence = (members) => {
  try {
    const presidentNumber = members.filter(member => member.role == 'president').length;
    const secretaryNumber = members.filter(member => member.role == 'secretary').length;
    const memberNumber = members.filter(member => member.role == 'member').length;
    if (presidentNumber != 1 || secretaryNumber != 1 || memberNumber < 2) {
      throw "WRONG_COMMITTEE_COMPONENCE";
    }
  } catch (err) {
    if (err == "WRONG_COMMITTEE_COMPONENCE") {
      throw err;
    }
    throw "BAD_REQUEST";
  }
}

const _checkDomains = (domains: Domain[]) => {
  if (domains.length == 0) {
    throw new ResponseError('Comisia trebuie să aibă domenii.');
  } else {
    const sameType = domains.map(domain => domain.type).every(domainType => domainType == domains[0].type);
    if (!sameType) {
      throw new ResponseError('Domeniile comisiei trebuie să fie de același tip.');
    }
  }
}

export const addCommittee = async (name: string, domainsIds: number[], members, activityDays: Omit<CommitteeActivityDayCreationAttributes, 'committeeId'>[]) => {
  // Will throw if the committee is badly formed
  checkCommitteeComponence(members);

  const transaction = await sequelize.transaction();
  try {
    const committee = await Committee.create({ name }, { transaction });
    const domains = await Domain.findAll({
      where: { // get domains from ids
        id: {
          [Op.in]: domainsIds
        }
      }
    });
    _checkDomains(domains);
    await committee.setDomains(domains, { transaction }); // set domains
    let committeeMembers = members.map(member => { // add the committee id
      return { ...member, committeeId: committee.id }
    });
    await CommitteeMember.bulkCreate(committeeMembers, { transaction });
    await CommitteeActivityDay.bulkCreate(
      activityDays.map(day => ({ ...day, committeeId: committee.id })),
      { transaction }
    );
    await transaction.commit();
  } catch (err) {
    console.log(err)
    await transaction.rollback();
    throw "VALIDATION_ERROR";
  }
}

export const editCommittee = async (id, name, domainsIds, members, activityDays: Omit<CommitteeActivityDayCreationAttributes, 'committeeId'>[]) => {
  // Will throw if the committee is badly formed
  checkCommitteeComponence(members);
  // Find the old committee by ID
  const oldCommittee = await Committee.findOne({ where: { id } });
  // If there is no committee to edit, throw
  if (!oldCommittee) {
    throw "BAD_REQUEST";
  }
  const transaction = await sequelize.transaction(); // init a transaction
  try {
    oldCommittee.name = name;
    await oldCommittee.save({ transaction });
    const domains = await Domain.findAll({
      where: { // get domains from ids
        id: {
          [Op.in]: domainsIds
        }
      }
    });
    _checkDomains(domains);
    await oldCommittee.setDomains(domains, { transaction }); // set domains
    await oldCommittee.setMembers([], { transaction }); // remove all the members in order to insert in bulk
    let committeeMembers = members.map(member => { // add the committee id
      return { ...member, committeeId: oldCommittee.id }
    });
    await CommitteeMember.bulkCreate(committeeMembers, { transaction });
    await CommitteeActivityDay.destroy({ where: { committeeId: oldCommittee.id }, transaction });
    await CommitteeActivityDay.bulkCreate(
      activityDays.map(day => ({ ...day, committeeId: oldCommittee.id })),
      { transaction }
    );
    await transaction.commit();

  } catch (err) {
    console.log(err)
    await transaction.rollback();
    throw "BAD_REQUEST";
  }
}

export const deleteCommittee = (id) => {
  return Committee.destroy({ where: { id } });
}

export const markCommitteeFinalGrades = async (id: number, finalGrades: boolean) => {
  const committee = await Committee.findOne({ where: { id } });
  if (!committee) {
    throw new ResponseErrorNotFound('Comisia nu există.');
  }
  committee.finalGrades = finalGrades;
  return committee.save();
}

export const setCommitteePapers = async (user: User, committeeId: number, paperIds: number[]) => {
  const committee = await Committee.findByPk(committeeId);
  if (!committee) {
    throw new ResponseErrorNotFound('Comisia nu există.');
  }
  const newPapers = await Paper.findAll({
    where: {
      id: { [Op.in]: paperIds }
    },
  });
  newPapers.forEach(paper => {
    if (!paper.submitted || paper.isValid === false) {
      throw new ResponseError(`Lucrarea "${paper.title}" nu poate fi atribuită, deoarece este invalidă sau nu este înscrisă.`);
    }
  });
  const existingPapers = await Paper.findAll({
    where: {
      committeeId
    }
  });
  const existingPapersDict = arrayMap(existingPapers, paper => paper.id);
  const newPapersDict = arrayMap(newPapers, paper => paper.id);
  const transaction = await sequelize.transaction();
  try {
    const removedPapers = existingPapers.filter(paper => !newPapersDict[paper.id]);
    const addedPapers = newPapers.filter(paper => !existingPapersDict[paper.id]);
    await Promise.all(
      removedPapers.map(async paper => {
        paper.committeeId = null;
        await paper.save({ transaction });
        await Logger.log(user, {
          name: LogName.PaperUnassigned,
          paperId: paper.id,
        });
      })
    );
    await Promise.all(
      addedPapers.map(async paper => {
        paper.committeeId = committeeId;
        await paper.save({ transaction });
        await Logger.log(user, {
          name: LogName.PaperAssigned,
          paperId: paper.id,
        });
      })
    );
    await transaction.commit();
    return newPapers;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export const autoAssignCommitteePapers = () => {
  return autoAssignPapers();
}

export const generateCommitteeCompositions = () => {
  return DocumentController.generateCommitteeCompositions();
}

export const generateCommitteeStudentsExcel = () => {
  return DocumentController.generateCommitteeStudentsExcel();
}

export const generateCommitteeStudents = () => {
  return DocumentController.generateCommitteeStudents();
}

// PAPERS

export interface GetPapersFilter {
  /** If paper is assigned to any committee */
  assigned?: boolean;
  /** ID of committee where the paper has been assigned */
  assignedTo?: number;
  /** ID of committee that can take the papers for grading. */
  forCommittee?: number;
  /** If papers must be valid. */
  isValid?: boolean;
  /** If papers must not be valid. */
  isNotValid?: boolean;
  /** If papers must be submitted. */
  submitted?: boolean;
  /** Paper type */
  type?: PaperType;
  /** Student domain */
  domainId?: number;
  /** Student specialization */
  specializationId?: number;
  /** Student study form */
  studyForm?: StudyForm;
  /** Paper title */
  title?: string;
  /** Student name */
  studentName: string;
}

export const getPapers = async (sort?: string, order?: SortOrder, filter?: GetPapersFilter,
  page?: number, pageSize?: number, minified?: boolean) => {
  let sortArray: OrderItem = ['id', 'ASC']
  if (['id', 'title', 'type', 'committeeId'].includes(sort) && ['ASC', 'DESC'].includes(order)) {
    sortArray = [sort, order];
  }

  let pagination: Pagination = {}
  if (page != undefined) {
    pagination.limit = pageSize;
    pagination.offset = page * pageSize;
  }
  let where: WhereOptions<Paper> = {};
  let studentWhere: WhereOptions<Student> = {};
  let userWhere: WhereOptions<User> = {};
  if (filter?.assigned != null) {
    where.committeeId = filter.assigned ? { [Op.ne]: null } : null;
  }
  if (filter?.assignedTo != null) {
    where.committeeId = filter.assignedTo;
  }
  if (filter?.isValid != null) {
    where.isValid = filter.isValid;
  }
  if (filter?.isNotValid != null) {
    if (filter?.isValid == false && filter?.isNotValid == false) {
      where.isValid = null;
    } else {
      where.isValid = filter.isNotValid ? false : { [Op.or]: [null, true] };
    }
  }
  if (filter.type) {
    where.type = filter.type;
  }
  if (filter.title) {
    where.title = { [Op.substring]: filter.title };
  }
  where.submitted = true;
  if (filter?.submitted != null) {
    where.submitted = filter.submitted;
  }
  if (filter.forCommittee != null) {
    const committee = await Committee.findOne({
      where: { id: filter.forCommittee },
      include: Committee.associations.domains
    });
    if (!committee) {
      throw "BAD_REQUEST";
    }
    const committeeDomainIds = committee.domains.map(domain => domain.id);
    studentWhere = {
      domainId: {
        [Op.in]: committeeDomainIds
      }
    }
  }

  if (filter.domainId != null) {
    studentWhere = { ...studentWhere, domainId: filter.domainId };
  }

  if (filter.specializationId != null) {
    studentWhere = { ...studentWhere, specializationId: filter.specializationId };
  }

  if (filter.studyForm != null) {
    studentWhere = { ...studentWhere, studyForm: filter.studyForm };
  }

  if (filter.studentName != null) {
    userWhere = { ...userWhere, ...makeNameClause(filter.studentName) }
  }

  let count = await Paper.count({
    where,
    include: [
      {
        association: Paper.associations.student,
        where: studentWhere,
        required: true,
        include: [{
          model: User,
          required: true,
          where: userWhere
        }]
      }
    ]
  });

  let scopes = ['student', 'teacher', 'topics'];
  if (!minified) {
    scopes.push('documents');
    scopes.push('documentReuploadRequests');
    scopes.push('committee');
    scopes.push('grades');
  }

  let rows = await Paper.scope(scopes).findAll({
    ...pagination,
    where,
    order: [sortArray],
    include: [
      {
        association: Paper.associations.student,
        where: studentWhere,
        required: true,
        include: [{
          model: User,
          required: true,
          where: userWhere
        }]
      }
    ]
  });
  const sessionSettings = await SessionSettings.findOne();
  rows = await Promise.all(JSON.parse(JSON.stringify(rows)).map(async paper => {
    let newPaper = JSON.parse(JSON.stringify(paper));
    newPaper.student = { ...paper.student.user, generalAverage: paper.student.generalAverage };
    newPaper.teacher = paper.teacher.user;
    if (!minified) {
      newPaper.requiredDocuments = await DocumentController.getPaperRequiredDocuments(paper.id, sessionSettings);
    }
    return newPaper;
  }))
  return { count, rows };
}

function getMissingRequiredDocuments(requiredDocuments: PaperRequiredDocument[], documents: Document[]) {
  const documentsByName = groupBy(documents, document => document.name);
  return requiredDocuments.map(requiredDocument => {
    const documents = documentsByName[requiredDocument.name] || [];
    const actualTypes = Object.fromEntries(Object.keys(requiredDocument.types).map(type => (
      [type, documents.some(doc => doc.type == type)]
    )));
    return {
      ...requiredDocument,
      actualTypes,
    };
  }).filter(requiredDocument => {
    return !Object.keys(requiredDocument.types).every(key => requiredDocument.actualTypes[key] == true);
  });
}

export async function requestDocumentsReupload(user: User, paperId: number, dtos: DocumentReuploadRequestCreationAttributes[]) {
  const paper = await Paper.scope(['student']).findOne({ where: { id: paperId } });
  if (!paper) {
    throw new ResponseErrorNotFound('Lucrarea nu există.');
  }
  const mappedPaper = mapPaper(paper);
  const existingRequests = await DocumentReuploadRequest.findAll({
    where: {
      paperId,
      documentName: { [Op.in]: dtos.map(dto => dto.documentName) }
    }
  });
  dtos.forEach(dto => {
    dto.paperId = paperId;
  });
  const transaction = await sequelize.transaction();
  try {
    const requests = await DocumentReuploadRequest.bulkCreate(dtos, { transaction });
    for (const request of existingRequests) {
      await request.destroy({ transaction });
      await Logger.log(user, {
        name: LogName.DocumentReuploadRequestDeleted,
        documentReuploadRequestId: request.id,
      }, { transaction });
    }
    await Mailer.sendDocumentReuploadRequestNotice(mappedPaper.student as any, requests);
    for (const request of requests) {
      await Logger.log(user, {
        name: LogName.DocumentReuploadRequestCreated,
        documentReuploadRequestId: request.id,
        paperId,
      }, { transaction });
    }
    await transaction.commit();
    return requests;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function cancelDocumentReuploadRequest(user: User, requestId: number) {
  const request = await DocumentReuploadRequest.findByPk(requestId);
  if (!request) {
    throw new ResponseErrorNotFound("Cererea de reîncărcare a documentului nu există.");
  }
  const transaction = await sequelize.transaction();
  try {
    await request.destroy({ transaction });
    await Logger.log(user, {
      name: LogName.DocumentReuploadRequestDeleted,
      documentReuploadRequestId: requestId,
      paperId: request.paperId,
    }, { transaction });
    await transaction.commit();
    return true;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

/** Validate/Invalidate a paper by its ID. */
export const validatePaper = async (user: User, paperId: number, validate: boolean, generalAverage?: number, ignoreRequiredDocs: boolean = false) => {
  const paper = await Paper.scope(['documents', 'student', 'teacher']).findOne({
    include: [
      {
        association: Paper.associations.student,
        include: [StudentExtraData, Domain, Specialization, User]
      }
    ],
    where: { id: paperId }
  });
  if (!paper) {
    throw new ResponseErrorNotFound("Lucrarea nu există.");
  }
  if (validate && (!generalAverage || generalAverage < 1 || generalAverage > 10)) {
    throw new ResponseError("Media generală este invalidă.", "GENERAL_AVERAGE_INVALID");
  }
  if (paper.isValid != null) {
    throw new ResponseError("Lucrarea a fost deja validată sau invalidată.", "ALREADY_VALIDATED");
  }
  if (!paper.submitted) {
    throw new ResponseError("Lucrarea nu a fost încă înscrisă.", "NOT_SUBMITTED");
  }
  paper.isValid = validate;

  if (validate) {
    const requiredDocs = (await DocumentController.getPaperRequiredDocuments(paperId, null))
      .filter(doc => doc.uploadBy == 'student');
    const missingRequiredDocuments = getMissingRequiredDocuments(requiredDocs, paper.documents);
    if (missingRequiredDocuments.length > 0 && !ignoreRequiredDocs) {
      throw new ResponseError(
        "Lucrarea nu conține toate documentele necesare. Validarea poate fi făcută prin ignorarea expresă a acestui fapt.",
        "MISSING_REQUIRED_DOCUMENTS"
      );
    }
    paper.student.generalAverage = generalAverage;
    const transaction = await sequelize.transaction();
    try {
      await paper.save({ transaction });
      await paper.student.save({ transaction });
      await Logger.log(user, {
        name: LogName.PaperValidated,
        paperId: paper.id,
        meta: { generalAverage, missingRequiredDocuments }
      }, { transaction });
      const signUpFormDocument = await Document.findOne({ where: { paperId: paper.id, name: 'sign_up_form', type: 'signed' }, transaction });
      if (signUpFormDocument) {
        let signatureSample: string | undefined;
        const signature = await SignaturesController.findOneByUserId(paper.studentId);
        if (signature) {
          const signatureSampleBuffer = await SignaturesController.getSample(signature.id);
          signatureSample = `data:image/png;base64,${signatureSampleBuffer.toString('base64')}`;
        }
        const generationProps: StudentDocumentGenerationProps = {
          student: paper.student,
          extraData: await StudentExtraData.findOne({ where: { studentId: paper.student.id } }),
          paper: mapPaper(paper),
          sessionSettings: await SessionSettings.findOne(),
          signatureSample,
        }
        let signUpFormBuffer = await DocumentController.generateSignUpForm(generationProps);
        await Logger.log(null, {
          name: LogName.DocumentContentUpdated,
          documentId: signUpFormDocument.id,
        }, { transaction });
        fs.writeFileSync(DocumentController.getStoragePath(`${signUpFormDocument.id}.pdf`), signUpFormBuffer);
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } else {
    const transaction = await sequelize.transaction();
    try {
      if (paper.committeeId) {
        paper.committeeId = null;
        await Logger.log(user, {
          name: LogName.PaperUnassigned,
          paperId: paper.id,
        }, { transaction });
      }
      await paper.save({ transaction });
      await Logger.log(user, {
        name: LogName.PaperInvalidated,
        paperId: paper.id,
      }, { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
  return true;
}

export const undoPaperValidation = async (user: User, paperId: number) => {
  const paper = await Paper.findOne({ where: { id: paperId } });
  if (!paper) {
    throw new ResponseErrorNotFound("Lucrarea nu există.");
  }
  if (paper.isValid == null) {
    throw new ResponseError("Lucrarea nu a fost validată sau invalidată.", "NOT_VALIDATED");
  }
  const transaction = await sequelize.transaction();
  try {
    paper.isValid = null;
    await paper.save({ transaction });
    await Logger.log(user, {
      name: LogName.PaperCancelledValidation,
      paperId: paper.id,
    }, { transaction });
    await transaction.commit();
    return true;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

// SESSION SETTINGS

export const changeSessionSettings = async (settings: SessionSettings) => {
  // Get the old settings
  let oldSettings = await SessionSettings.findOne();
  // If settings are set, do update query
  if (oldSettings) {
    if (oldSettings.currentPromotion != settings.currentPromotion) {
      redisDel('paperRequiredDocs');
    }
    return SessionSettings.update(settings, { where: { lock: 'X' } });
  } else { // else do create query
    return SessionSettings.create(settings)
  }
}

export const beginNewSession = async (user: User) => {
  const transaction = await sequelize.transaction();
  try {
    const studentUsers = await User.findAll({
      include: [
        {
          model: Student,
          required: true,
          include: [
            {
              model: Paper.scope(['grades']),
            }
          ]
        }
      ]
    });

    for (user of studentUsers) {
      if (!user.student.paper) continue;
      const paperId = user.student.paper.id;
      if (user.student.paper.gradeAverage >= 6) {
        await user.destroy({ transaction, force: true });
      } else {
        await Student.update({ generalAverage: null }, { where: { id: user.id }, transaction });
        await StudentExtraData.destroy({ where: { studentId: user.id }, transaction });
        await Paper.update({ submitted: false, isValid: null }, { where: { id: paperId }, transaction });
        await Document.destroy({ where: { paperId }, transaction });
        await PaperGrade.destroy({ where: { paperId }, transaction });
      }
    };
    await Log.destroy({ where: { id: { [Op.ne]: null } }, transaction, force: true, limit: 1000000000 });
    await Document.destroy({ where: { id: { [Op.ne]: null } }, transaction, force: true, limit: 100000 });
    await DocumentReuploadRequest.destroy({ where: { id: { [Op.ne]: null } }, transaction, force: true, limit: 100000 });
    await Committee.destroy({ where: { id: { [Op.ne]: null } }, transaction, limit: 100000 });
    await Application.destroy({ where: { id: { [Op.ne]: null } }, transaction, limit: 100000 });
    await SessionSettings.update({ sessionName: 'Sesiune nouă', allowGrading: false }, { where: { lock: 'X' }, transaction });
    await redisDel('paperRequiredDocs');
    await redisDel('sessionSettings');
    await transaction.commit();
    return SessionSettings.findOne();
  } catch (err) {
    console.log(err)
    await transaction.rollback();
    throw new ResponseError("A apărut o eroare. Contactați administratorul.", "INTERNAL_ERROR", 500);
  }
}

const literals = {
  DOMAIN_STUDENT_NUMBER: `(
    SELECT COUNT(student.id)
    FROM students AS student
    WHERE student.domainId = domain.id
  )`,
  DOMAIN_OFFER_NUMBER: `(
    SELECT COUNT(offer.id)
    FROM offers AS offer
    WHERE offer.domainId = domain.id
  )`
}