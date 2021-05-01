import { Document, DocumentCategory, DomainType, DocumentType, Paper, sequelize, SessionSettings,
    StudentExtraData, Domain, UploadPerspective, User, Student, Committee, Specialization } from "../models/models";
import ejs from 'ejs';
import HtmlToPdf from 'html-pdf-node';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { Model } from "sequelize/types";
import * as AuthController from "./auth.controller"
import { PaperRequiredDocument, paperRequiredDocuments } from '../paper-required-documents';
import { UploadedFile } from "express-fileupload";

const HtmlToPdfOptions = { format: 'A4', printBackground: true };

export const getStoragePath = (fileName: string) => {
    return path.resolve(process.env.PWD, 'storage', 'documents', fileName);
}

const getDocumentTemplatePath = (docName: string) => {
    let fileName: string = docName + '.ejs';
    return path.resolve(process.env.PWD, 'src', 'document-templates', fileName);
}

/** Delete a document by ID. Only the person that uploaded the document can delete it. */
export const deleteDocument = async (user: User, documentId: number): Promise<boolean> => {
    const document = await Document.findOne({ 
        where: { id: documentId },
        include: [ Document.associations.paper ]
    });
    if(!document) {
        throw "NOT_FOUND";
    }
    if(document.uploadedBy != user.id) {
        throw "UNAUTHORIZED";
    }
    if(document.paper.isValid != null && user.type != 'teacher') {
        throw "PAPER_CANNOT_CHANGE";
    }
    // Check if document category can be modified
    if (user.type == 'student' && !(await checkFileSubmissionPeriod(document.category))) {
        throw "NOT_IN_FILE_SUBMISSION_PERIOD";
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

    if (type == 'generated') { // do not allow "uploading" generated files
        throw "BAD_REQUEST";
    }
    // Find the paper and check if it is valid
    const paper = await Paper.findOne({ where: { id: paperId } });
    if(paper.isValid != null && perspective != 'committee') {
        throw "PAPER_CANNOT_CHANGE";
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

    const category = requiredDoc.category;

    // Check if document category can be uploaded
    if (!(await checkFileSubmissionPeriod(category, sessionSettings))) {
        throw "NOT_IN_FILE_SUBMISSION_PERIOD";
    }

    const fileExtension = mime.extension(mimeType); // get the file extension

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

export const checkFileSubmissionPeriod = async (category: DocumentCategory, sessionSettings?: SessionSettings) => {
    if (!sessionSettings) {
        sessionSettings = await SessionSettings.findOne();
    }
    if (sessionSettings == null) { // settings not set
        return false;
    }
    const today = new Date().setHours(0, 0, 0, 0);
    let startDate: number, endDate: number;
    if(category == 'secretary_files') {
      startDate = new Date(sessionSettings.fileSubmissionStartDate).setHours(0, 0, 0, 0);
      endDate = new Date(sessionSettings.fileSubmissionEndDate).setHours(0, 0, 0, 0);
    } else if(category == 'paper_files') {
      startDate = new Date(sessionSettings.fileSubmissionStartDate).setHours(0, 0, 0, 0);
      endDate = new Date(sessionSettings.paperSubmissionEndDate).setHours(0, 0, 0, 0);
    }
    return startDate <= today && today <= endDate;
}

/** [ promotion, studyForm, specialization ] */
type Group = [string, string, string];

/** Function used to check if two groups are equal. */
const equalGroups = (first: Group, second: Group) => {
    for(let i = 0; i < first.length; i++) {
        if(first[i] != second[i]) {
            return false;
        }
    }
    return true;
}

/** Checks if user is the president or the secretary of the committee. 
 * @Throws "NOT_AUTHORIZED"
*/
const checkCommitteeDocumentGenerationRight = (user: User, committee: Committee) => {
    let president = committee.members.find(member => member.committeeMember.role == 'president');
    let secretary = committee.members.find(member => member.committeeMember.role == 'secretary');
    if(president.id != user.teacher.id && secretary.id != user.teacher.id) {
        throw "NOT_AUTHORIZED";
    }
    return true;
}

export const generateCommitteeCatalog = async (user: User, committeId: number): Promise<Buffer> => {
    const committee = await Committee.findOne({
        where: { id: committeId },
        include: [
            {
                model: Paper.scope(['teacher', 'grades']),
                include: [{
                    association: Paper.associations.student,
                    include: [User.scope('min'), <typeof Model>StudentExtraData,
                    <typeof Model>Specialization, <typeof Model>Domain]
                }]
            }
        ]
    });
    if(user.type == 'teacher') {
        checkCommitteeDocumentGenerationRight(user, committee);
    }
    let groupArr: Group[] = committee.papers.map(paper => {
        return [ paper.student.promotion, paper.student.studyForm, paper.student.specialization.name ];
    });
    // Get unique values of groupArr
    groupArr = groupArr.filter((firstGroup, i, arr) =>
        arr.findIndex(secondGroup => equalGroups(firstGroup, secondGroup)) == i);
    
    // For each group, get the corresponding papers
    let paperGroups = groupArr.map(group => {
        return committee.papers.filter(paper => {
            let paperGroup: Group = [ paper.student.promotion, paper.student.studyForm, paper.student.specialization.name ];
            return equalGroups(group, paperGroup);
        });
    });

    // Get session settings
    const sessionSettings = await SessionSettings.findOne();

    const content = await ejs.renderFile(getDocumentTemplatePath("committee_catalog"), { committee, paperGroups, sessionSettings } );
    const footerTemplate = await ejs.renderFile(getDocumentTemplatePath("committee_catalog_footer"), { committee } );
    // Set orientation, margins and footer
    let renderSettings = { ...HtmlToPdfOptions, landscape: true, 
        margin: { bottom: '5cm', top: '2cm' },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>', footerTemplate }
    let fileBuffer = HtmlToPdf.generatePdf({ content }, renderSettings);
    return fileBuffer as Buffer;
}

export const generateCommitteeFinalCatalog = async (user: User, committeId: number): Promise<Buffer> => {
    const committee = await Committee.findOne({
        where: { id: committeId },
        include: [
            {
                model: Paper.scope(['teacher', 'grades']),
                include: [{
                    association: Paper.associations.student,
                    include: [User.scope('min'), <typeof Model>StudentExtraData,
                    <typeof Model>Specialization, <typeof Model>Domain]
                }]
            }
        ]
    });
    if(user.type == 'teacher') {
        checkCommitteeDocumentGenerationRight(user, committee);
    }
    let groupArr: Group[] = committee.papers.map(paper => {
        return [ null, paper.student.studyForm, paper.student.specialization.name ];
    });
    // Get unique values of groupArr
    groupArr = groupArr.filter((firstGroup, i, arr) =>
        arr.findIndex(secondGroup => equalGroups(firstGroup, secondGroup)) == i);
    
    // For each group, get the corresponding papers
    let paperGroups = groupArr.map(group => {
        return committee.papers.filter(paper => {
            let paperGroup: Group = [ null, paper.student.studyForm, paper.student.specialization.name ];
            return equalGroups(group, paperGroup);
        });
    });

    // Group the previous results by promotion
    let paperPromotionGroups = paperGroups.map(paperGroup => {
        // Get unique promotions in group
        let promotions = new Set(paperGroup.map(paper => paper.student.promotion));
        let promotionItems = [];
        // For every promotion, get the papers
        promotions.forEach(promotion => {
            let result = { promotion, items: paperGroup.filter((paper => paper.student.promotion == promotion)) };
            promotionItems.push(result);
        });
        return promotionItems;
    });

    // Get session settings
    const sessionSettings = await SessionSettings.findOne();

    const content = await ejs.renderFile(getDocumentTemplatePath("committee_final_catalog"), { committee, paperPromotionGroups, sessionSettings } );
    const footerTemplate = await ejs.renderFile(getDocumentTemplatePath("committee_catalog_footer"), { committee, minified: true } );
    // Set margins and footer
    let renderSettings = { ...HtmlToPdfOptions, margin: { bottom: '2cm', top: '1cm' },
        displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate }
    let fileBuffer = HtmlToPdf.generatePdf({ content }, renderSettings);
    return fileBuffer as Buffer;
}

export const generateCommitteeCompositions = async () => {
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
    let groups = [];
    uniqueDomains.forEach(domain => {
        let group = committees.filter(committee => committee.domains.map(domain => domain.id).join('.') == domain);
        groups.push(group);
    });
    const sessionSettings = await SessionSettings.findOne();
    const content = await ejs.renderFile(getDocumentTemplatePath("committee_compositions"), { groups, sessionSettings } );
    let fileBuffer = HtmlToPdf.generatePdf({ content }, HtmlToPdfOptions);
    return fileBuffer as Buffer;
}
