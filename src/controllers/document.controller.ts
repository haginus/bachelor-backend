import { Document, DocumentCategory, DomainType, DocumentType, Paper, sequelize, SessionSettings,
    StudentExtraData, Domain, UploadPerspective, User, Student } from "../models/models";
import ejs from 'ejs';
import HtmlToPdf from 'html-pdf-node';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { Model } from "sequelize/types";
import * as AuthController from "./auth.controller"
import { PaperRequiredDocument, paperRequiredDocuments } from '../paper-required-documents';
import { UploadedFile } from "express-fileupload";

const HtmlToPdfOptions = { format: 'A4' };

export const getStoragePath = (fileName: string) => {
    return path.resolve(process.env.PWD, 'storage', 'documents', fileName);
}

const getDocumentTemplatePath = (docName: string) => {
    let fileName: string = docName + '.ejs';
    return path.resolve(process.env.PWD, 'src', 'document-templates', fileName);
}

/** Delete a document by ID. Only the person that uploaded the document can delete it. */
export const deleteDocument = async (user: User, documentId: number): Promise<boolean> => {
    const document = await Document.findOne({ where: { id: documentId } });
    if(!document) {
        throw "NOT_FOUND";
    }
    if(document.uploadedBy != user.id) {
        throw "UNAUTHORIZED";
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
    if(!document) {
        throw "NOT_FOUND";
    }

    // Admin and student can view all documents, teacher can only view 'paper_files' category
    const canViewAsOwner = user.type == 'admin' || (user.type == 'student' && document.paper.studentId == user.student.id)
            || (user.type == 'teacher' && document.category == 'paper_files' && document.paper.teacherId == user.teacher.id)
    
    if(!canViewAsOwner) {
        // If user is not admin or owner of the paper, there is still a chance user's part of the committee reviewing the paper
        // committee members can only view 'paper_files'
        if(user.type == 'teacher' && document.category == 'paper_files') {
            let isInCommittee: boolean = (await user.teacher.getCommittees({
                include: [{
                    model: Paper as typeof Model,
                    required: true,
                    where: {
                        id: document.paper.id
                    }
                }]
            })).length > 0;
            // If user is not in committee, it means they don't have access to the file
            if(!isInCommittee) {
                throw "NOT_AUTHORIZED";
            }
        } else {
            throw "NOT_AUTHORIZED";
        }
    }
    const extension = mime.extension(document.mimeType);
    try {
        let buffer = fs.readFileSync(getStoragePath(`${document.id}.${extension}`));
        return buffer;
    } catch(err) {
        console.log(err)
        throw "INTERNAL_NOT_FOUND";
    }
}

export const generateDocument = (name, data) => {
    if(name == 'sign_up_form') {
        return generateSignUpForm(data);
    }
    if(name == 'statutory_declaration') {
        return generateStatutoryDeclaration(data);
    }
    if(name == 'liquidation_form') {
        return generateLiquidationForm(data);
    }

    throw "INVALID_DOCUMENT_NAME";
}

const generateSignUpForm = async (student) => {
    const today = new Date();
    const birth = new Date(student.extra.dateOfBirth);
    
    const date = today.toLocaleDateString('ro-RO', { year: 'numeric', month: 'numeric', day: 'numeric' });
    const birthDate = birth.toLocaleDateString('ro-RO', { year: 'numeric', month: 'numeric', day: 'numeric' });

    const content = await ejs.renderFile(getDocumentTemplatePath("sign_up_form"), { student, date, birthDate } );
    let fileBuffer = HtmlToPdf.generatePdf({ content }, HtmlToPdfOptions);
    return fileBuffer;
}

const generateStatutoryDeclaration = async (student) => {
    const today = new Date();

    const date = today.toLocaleDateString('ro-RO', { year: 'numeric', month: 'numeric', day: 'numeric' });
    const content = await ejs.renderFile(getDocumentTemplatePath("statutory_declaration"), { student, date } );
    let fileBuffer = HtmlToPdf.generatePdf({ content }, HtmlToPdfOptions);
    return fileBuffer;
}

const generateLiquidationForm = async (student) => {
    const today = new Date();
    const birth = new Date(student.extra.dateOfBirth);
    
    const date = today.toLocaleDateString('ro-RO', { year: 'numeric', month: 'numeric', day: 'numeric' });
    const birthDate = birth.toLocaleDateString('ro-RO', { year: 'numeric', month: 'numeric', day: 'numeric' });
    const content = await ejs.renderFile(getDocumentTemplatePath("liquidation_form"), { student, date, birthDate } );
    let fileBuffer = HtmlToPdf.generatePdf({ content }, HtmlToPdfOptions);
    return fileBuffer;
}

export const uploadPaperDocument = async (user: User, documentFile: UploadedFile,
    name: string, type: DocumentType, perspective: UploadPerspective, paperId: number) => {
    
    const sessionSettings = await SessionSettings.findOne();

    if (!(await checkFileSubmissionPeriod(sessionSettings))) {
        throw "NOT_IN_FILE_SUBMISSION_PERIOD";
    }

    if (type == 'generated') { // do not allow "uploading" generated files
        throw "BAD_REQUEST";
    }

    const requiredDocuments = await getPaperRequiredDocuments(paperId, sessionSettings);
    const mimeType = documentFile.mimetype; // get uploaded file mimeType
    const uploadedBy = user.id;
    const requiredDoc = requiredDocuments
        .find(doc => doc.name == name && doc.uploadBy == perspective); // find uploaded doc name in required list
    if (!requiredDoc) { // if it is not then throw error
        throw "INVALID_DOCUMENT";
    }
    if (!requiredDoc.types[type]) { // check if uploaded doc type is required
        throw "INVALID_DOCUMENT_TYPE";
    }
    const acceptedMimeTypes = requiredDoc.acceptedMimeTypes.split(','); // get accepted mimeTypes
    if (!acceptedMimeTypes.includes(mimeType)) { // check if uploaded doc mimeType is in the accepted array
        throw "INVALID_DOCUMENT_MIMETYPE";
    }

    const fileExtension = mime.extension(mimeType); // get the file extension
    const category = requiredDoc.category as DocumentCategory;

    const paperDocuments = await Document.findAll({ where: { name, paperId } }); // find all documents of name from paper

    if (type == 'signed') { // if uploaded document type is signed
        if (paperDocuments.filter(doc => doc.type == 'generated').length == 0) { // check if generated document exists
            throw "MISSING_GENERATED_DOCUMENT";
        }
        if (paperDocuments.filter(doc => doc.type == 'signed').length > 0) { // check if not signed before
            throw "ALREADY_SIGNED";
        }
    }

    if (type == 'copy') { // if uploaded document type is copy
        if (paperDocuments.filter(doc => doc.type == 'copy').length > 0) { // check if uploaded before
            throw "ALREADY_UPLOADED";
        }
    }

    const transaction = await sequelize.transaction(); // start a db transaction
    const newDocument = await Document.create({ name, type, mimeType, paperId, category, uploadedBy }, { transaction }); // create a new doc in db
    try {
        fs.writeFileSync(getStoragePath(`${newDocument.id}.${fileExtension}`), documentFile.data); // write doc to storage, throws error
        await transaction.commit(); // commit if everything is fine
    } catch (err) {
        console.log(err);
        await transaction.rollback(); // rollback if anything goes wrong
        throw "INTERNAL_ERROR";
    }

    return newDocument;
}


export const getPaperRequiredDocuments = async (paperId: number, sessionSettings?: SessionSettings):
    Promise<PaperRequiredDocument[]> => { 

    const paper = await Paper.findOne({
        include: [
            {
                association: Paper.associations.student,
                include: [
                    StudentExtraData as typeof Model,
                    Domain as typeof Model
                ]
            }
        ],
        where: { id: paperId }
    })

    if (!paper) { // if student has no paper
        throw "UNAUTHORIZED";
    }

    if (!sessionSettings) { // if sessionSettings was not provided
        sessionSettings = await AuthController.getSessionSettings();
    }

    const extraData = paper.student.studentExtraDatum;

    let isMarried: boolean;
    let isPreviousPromotion: boolean;
    let paperType: DomainType;

    if (!extraData) { // if student didn't set up extraData, we assume the following
        isMarried = false;
    } else { // else we get the data we need
        isMarried = ['married', 're_married', 'widow'].includes(extraData.civilState);
    }

    isPreviousPromotion = sessionSettings?.currentPromotion != paper.student.promotion; // check if student is in different promotion
    paperType = paper.student.domain.type; // paper type is the same as student domain type

    return paperRequiredDocuments.filter(doc => {
        if (!doc.onlyFor) { // if document is required for everyone
            return true;
        }
        if (doc.onlyFor.married && !isMarried) { // if document requires married status and student is not married
            return false;
        }
        if (doc.onlyFor.paperType && doc.onlyFor.paperType != paperType) { // if doc requires a different paper type
            return false;
        }
        if (doc.onlyFor.previousPromotions && !isPreviousPromotion) { // if doc requires a previous promotion and student is in current promotion
            return false;
        }
        return true; // if all tests passed then student needs to have this document
    }).map(doc => {
        let sentDoc = { ...doc }
        delete sentDoc['onlyFor']; // remove the onlyFor attribute
        sentDoc.acceptedExtensions = doc.acceptedMimeTypes.split(',') // get accepted extensions from mimeType
            .map(mimeType => mime.extension(mimeType)).filter(t => t) as string[]; // remove not found mimeType extensions (false)
        return sentDoc;
    });
}

export const checkFileSubmissionPeriod = async (sessionSettings?: SessionSettings) => {
    if (!sessionSettings) {
        sessionSettings = await SessionSettings.findOne();
    }
    if (sessionSettings == null) { // settings not set
        return false;
    }
    const today = new Date().setHours(0, 0, 0, 0);
    const start = new Date(sessionSettings.fileSubmissionStartDate).setHours(0, 0, 0, 0);
    const end = new Date(sessionSettings.fileSubmissionEndDate).setHours(0, 0, 0, 0);

    return start <= today && today <= end;
}