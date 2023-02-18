import { Student, User, Topic, Teacher, Offer, Application, Paper, Domain, sequelize, StudentExtraData, Address, Document, SessionSettings, Specialization, DocumentType, Committee, PaperGrade } from "../models/models";
import * as UserController from './user.controller';
import * as DocumentController from './document.controller';
import * as AuthController from './auth.controller';
import { Model, Op, Sequelize, Transaction, ValidationError } from "sequelize";
import fs from 'fs';
import path from 'path';
import { UploadedFile } from "express-fileupload";
import * as Mailer from "../alerts/mailer";
import { canApply, copyObject, inclusiveDate, ResponseError, ResponseErrorForbidden, ResponseErrorInternal } from "../util/util";
import { redisHSet } from "../util/redis";
import * as PaperController from "./paper.controller";

export interface GetTeacherOffersFilters {
  teacherName?: string;
  topicIds?: number[];
  onlyFree?: boolean
}

export class StudentController {
  public static validateStudent = async (user: User, topicIds: number[]) => {
    if (!topicIds || !Array.isArray(topicIds) || topicIds.length == 0) {
      throw new ResponseError('Lipsesc temele.', 'MISSING_TOPICS');
    }
    if (user.validated) {
      throw new ResponseErrorForbidden();
    }
    const transaction = await sequelize.transaction();
    try {
      user.validated = true;
      await user.save({ transaction });
      await user.student.setTopics(topicIds, { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
    return true;
  }

  public static getTeacherOffers = async (user: User, filters: GetTeacherOffersFilters) => {
    let teacherNameFilter = {}

    if (filters?.teacherName) {
      const names = filters.teacherName.split(' ');  // split name in parts
      let orClauses = names.map(name => {
        return {
          [Op.or]: [
            { firstName: { [Op.substring]: name } },
            { lastName: { [Op.substring]: name } },
          ]
        }
      }).splice(0, 3); // only 3 names so it doesn't create a big complexity
      teacherNameFilter = {
        [Op.or]: orClauses
      }
    }

    let topicFilter = filters.topicIds ? { topicId: filters.topicIds } : {}
    let onlyFreeOffersFilter = filters.onlyFree ?
      { limit: { [Op.gt]: StudentController.literals.countOfferAcceptedApplications } } : {}

    // the filters will be added to the query object by destructuring (i.e. ...topicFilter)

    let student = user.student;
    let result = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email'],
      where: {
        ...teacherNameFilter
      },
      include: [
        {
          association: User.associations.profile,
        },
        {
          association: User.associations.teacher,
          required: true,
          include: [{
            association: Teacher.associations.offers,
            required: true,
            where: {
              domainId: student.domainId,
              ...onlyFreeOffersFilter
            },
            attributes: {
              exclude: ['teacherId'],
              include: [
                [StudentController.literals.countOfferAcceptedApplications, 'takenPlaces'],
                [StudentController.literals.studentHasAppliedOffer(student.id), 'hasApplied']
              ],
            },
            include: [{
              association: Offer.associations.topics,
              required: true,
              through: {
                attributes: [],
                where: {
                  ...topicFilter
                }
              },
            }]
          }]
        }],
    });

    return copyObject(result).map(user => {
      let teacher = user.teacher;
      delete user.teacher;
      return { ...user, offers: teacher.offers }
    })
  }

  private static literals = {
    countOfferAcceptedApplications: Sequelize.literal(`(
        SELECT COUNT(*)
        FROM applications AS application
        WHERE
            application.offerId = \`teacher->offers\`.id
            AND
            application.accepted = 1
    )`),
    studentHasAppliedOffer(studentId) {
      return Sequelize.literal(`(
            SELECT COUNT(*)
            FROM applications AS application
            WHERE
                application.offerId = \`teacher->offers\`.id
                AND
                application.studentId = ${studentId}
        )`);
    },
    countOfferAcceptedApplicationsForApplications: Sequelize.literal(`(
        SELECT COUNT(*)
        FROM applications AS app
        WHERE
            app.offerId = \`offer\`.id
            AND
            app.accepted = 1
    )`),
  }

  public static getSuggestedTeacherOffers = async (user: User) => {
    const topics = await user.student.getTopics();
    const filters = {
      topicIds: topics.map(topic => topic.id)
    }
    return StudentController.getTeacherOffers(user, filters);
  }

  public static applyToOffer = async (user: User, offerId: number, title: string, description: string,
    usedTechnologies: string) => {
    if (!(await StudentController.checkApplyPeriod())) { // check if today is in the application period
      throw new ResponseErrorForbidden('Nu puteți trimite cereri în afara perioadei de aplicare.', 'NOT_IN_APPLY_PERIOD');
    }
    const offer = await Offer.findByPk(offerId, {
      include: [
        Offer.associations.applications,
        {
          association: Offer.associations.teacher,
          include: [Teacher.associations.user]
        }
      ]
    }); // get offer
    if (!offer) {
      throw new ResponseError('Oferta nu a fost găsită.', 'OFFER_NOT_FOUND');
    }
    const student = user.student;
    // check if student is associated
    if (student.paper) {
      throw new ResponseErrorForbidden('Nu puteți trimite cereri dacă aveți deja o lucrare.');
    }
    // check same domains
    if (student.domainId != offer.domainId) {
      throw new ResponseErrorForbidden('Oferta nu vă este adresată.', 'DOMAIN_MISMATCH');
    }
    // check if limit is higher than the accepted application number
    if (offer.applications.filter(application => application.accepted).length + 1 > offer.limit) {
      throw new ResponseErrorForbidden('Oferta și-a atins numărul maxim de locuri.', 'BUSY_OFFER');
    }
    // check double applications
    if (offer.applications.filter(application => application.studentId == student.id).length > 0) {
      throw new ResponseErrorForbidden('Ați aplicat deja la această ofertă.', 'ALREADY_APPLIED');
    }
    let application = await Application.create({
      title, description, usedTechnologies,
      studentId: student.id, offerId: offer.id
    });
    Mailer.sendNewApplicationEmail(user, offer.teacher.user, application);
    return application;
  }

  public static getApplications = async (user: User, state: string) => {
    const student = user.student;
    let stateFilter = {};
    switch (state) {
      case 'accepted':
        stateFilter = { accepted: true }
        break
      case 'declined':
        stateFilter = { accepted: false }
        break
      case 'pending':
        stateFilter = { accepted: null }
        break
      default:
        stateFilter = {}
    }

    let result = await Application.findAll({
      where: {
        studentId: student.id,
        ...stateFilter
      },
      include: [
        {
          required: true,
          association: Application.associations.offer,
          include: [
            Offer.associations.domain,
            Offer.associations.topics,
            {
              association: Offer.associations.teacher,
              include: [
                User.scope(['min', 'profile'])
              ]
            },
          ],
          attributes: {
            include: [
              [StudentController.literals.countOfferAcceptedApplicationsForApplications, 'takenPlaces']
            ]
          }
        },
      ],
      order: [
        ['accepted', 'ASC']
      ],
    });

    result = JSON.parse(JSON.stringify(result)).map(application => {
      application.offer.teacher = application.offer.teacher.user;
      return application;
    })

    return result;
  }

  private static getApplication = (id: number) => {
    return Application.findByPk(id, {
      include: [Application.associations.offer]
    });
  }

  public static cancelApplication = async (user: User, applicationId: number) => {
    const student = user.student;

    let application = await StudentController.getApplication(applicationId);
    if (!application) {
      new ResponseError('Cererea nu există.', 'MISSING_APPLICATION');
    }
    if (application.studentId != student.id) {
      throw new ResponseErrorForbidden();
    }
    // student can't delete an application after it has been accepted / declined by teacher
    if (application.accepted != null) {
      throw new ResponseErrorForbidden();
    }
    await application.destroy();
    return { success: true }
  }

  public static getPaper = async (user: User) => {
    const student = user.student;
    const paper = await student.getPaper({ scope: ["documents", "teacher", "topics"] });
    let committee: Committee, grades: PaperGrade[] = [];
    if (paper.committeeId) {
      committee = await paper.getCommittee({ scope: 'min' });
      if (committee.finalGrades) {
        grades = await paper.getGrades();
        paper.grades = grades;
      }
    }
    let paperRes: any = paper.toJSON(); // sequelize will return the user info nested as `user` in paper.teacher
    if (paper) {
      paperRes.teacher = paper.teacher.user;
      paperRes.grades = [];
      paperRes.committee = committee;
    }
    return paperRes;
  }

  /** Check if student can edit paper. */
  private static checkEditPaper = (paper: Paper, sessionSettings: SessionSettings) => {
    const today = Date.now();
    const endDateSecretary = inclusiveDate(sessionSettings.fileSubmissionEndDate).getTime();
    const paperCreatedAt = new Date(paper.createdAt);
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    return (paperCreatedAt.getTime() + SEVEN_DAYS <= today || today + SEVEN_DAYS >= endDateSecretary) &&
      today <= endDateSecretary && paper.isValid == null;
  }

  public static editPaper = async (user: User, title: string, description: string, topicIds: number[]) => {
    const paperId = user.student.paper?.id;
    if(!paperId) {
      throw new ResponseError("Lucrarea nu există.", "PAPER_NOT_FOUND", 404);
    }
    return PaperController.editPaper(user, paperId, title, description, topicIds);
  }

  public static submitPaper = async (user: User, submit: boolean) => {
    const paper = user.student.paper;
    if (!paper) {
      throw new ResponseError("Lucrarea nu există.", "PAPER_NOT_FOUND", 404);
    }
    const sessionSettings = await SessionSettings.findOne();
    if (Date.now() > inclusiveDate(sessionSettings.paperSubmissionEndDate).getTime() || paper.isValid) {
      throw new ResponseErrorForbidden("Nu vă mai puteți înscrie/retrage din această sesiune.");
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

  public static getExtraData = async (user: User) => {
    return user.student.getStudentExtraDatum({ scope: 'noKeys' });
  }

  public static setExtraData = async (user: User, data: StudentExtraData) => {  // sets the new extra data and triggers document generation
    const sessionSettings = await SessionSettings.findOne();
    if (!(await DocumentController.checkFileSubmissionPeriod('secretary_files', sessionSettings))) {
      throw new ResponseErrorForbidden('Nu suntem în perioada de trimitere de documente.', 'NOT_IN_FILE_SUBMISSION_PERIOD');
    }
    const student = user.student;
    const oldData = await StudentExtraData.findOne({ where: { studentId: student.id } });
    let newAddress, newMainData;
    try {
      newAddress = data.address;
      newMainData = { ...data };
      delete newMainData["address"];
      delete newMainData["id"]; // remove attributes that may interfere to the normal identification process
      delete newMainData["studentId"];
      delete newAddress["id"];
      delete newAddress["studentExtraDatumId"];
    } catch (err) {
      throw new ResponseError('Date invalide.', 'INVALID_DATA');
    }
    const transaction = await sequelize.transaction(); // initialize a SQL transaction
    const studentPaper = await Paper.findOne({ 
      where: { studentId: student.id }, 
      include: [{ model: Teacher, include: [User] }] 
    });
    if (oldData) { // if data exists
      try {
        let [dataUpdated] = await StudentExtraData.update(newMainData, {
          where: { studentId: student.id },
          transaction,
          fields: ["birthLastName", "parentInitial", "fatherName", "motherName", "civilState", "dateOfBirth", "citizenship",
            "ethnicity", "placeOfBirthCountry", "placeOfBirthCounty", "placeOfBirthLocality", "landline", "mobilePhone", "personalEmail"]
        }); // update main data
        let [addressUpdated] = await Address.update(newAddress, {
          where: { studentExtraDatumId: oldData.id },
          transaction,
          fields: ["locality", "county", "street", "streetNumber", "building", "stair", "floor", "apartment"]
        }); // update address
        if (dataUpdated || addressUpdated) {
          await PaperController.generatePaperDocuments(PaperController.mapPaper(studentPaper), data, sessionSettings, transaction);
        }
        redisHSet('paperRequiredDocs', student.paper?.id, null);
        await transaction.commit();
      } catch (err) {
        console.log(err)
        await transaction.rollback(); // in case anything goes wrong, we rollback the transaction
        if (err instanceof ValidationError) {
          throw new ResponseError('Date invalide.', 'INVALID_DATA');
        } else {
          throw err;
        }
      }
    } else { // if data does not exist, we create it
      try {
        newMainData.studentId = student.id;
        let extraDataModel = await StudentExtraData.create(newMainData, { transaction });
        let addressModel = await Address.create(newAddress, { transaction });
        await extraDataModel.setAddress(addressModel, { transaction });
        await PaperController.generatePaperDocuments(PaperController.mapPaper(studentPaper), data, sessionSettings, transaction);
        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        if (err instanceof ValidationError) {
          throw new ResponseError('Date invalide.', 'INVALID_DATA');
        } else {
          throw err;
        }
      }
    }
    return { success: true }
  }

  public static uploadPaperDocument = (user: User, documentFile: UploadedFile, name: string, type: DocumentType) => {
    return DocumentController.uploadPaperDocument(user, documentFile, name, type, 'student', user.student.paper.id);
  }


  public static getPaperRequiredDocuments = (user: User) => {
    return DocumentController.getPaperRequiredDocuments(user.student.paper.id);
  }

  public static checkApplyPeriod = async () => {
    const sessionSettings = await SessionSettings.findOne();
    if (sessionSettings == null) { // settings not set
      return false;
    }
    return canApply(sessionSettings);
  }


}