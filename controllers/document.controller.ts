import { Committee, Document, Paper, sequelize, Teacher, User } from "../models/models";
import ejs from 'ejs';
import HtmlToPdf from 'html-pdf-node';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { Model } from "sequelize/types";

const HtmlToPdfOptions = { format: 'A4' };

export const getStoragePath = (fileName: string) => {
    return path.resolve(process.env.PWD, 'storage', 'documents', fileName);
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

    const content = await ejs.renderFile("./document-templates/sign_up_form.ejs", { student, date, birthDate } );
    let fileBuffer = HtmlToPdf.generatePdf({ content }, HtmlToPdfOptions);
    return fileBuffer;
}

const generateStatutoryDeclaration = async (student) => {
    const today = new Date();

    const date = today.toLocaleDateString('ro-RO', { year: 'numeric', month: 'numeric', day: 'numeric' });
    const content = await ejs.renderFile("./document-templates/statutory_declaration.ejs", { student, date } );
    let fileBuffer = HtmlToPdf.generatePdf({ content }, HtmlToPdfOptions);
    return fileBuffer;
}

const generateLiquidationForm = async (student) => {
    const today = new Date();
    const birth = new Date(student.extra.dateOfBirth);
    
    const date = today.toLocaleDateString('ro-RO', { year: 'numeric', month: 'numeric', day: 'numeric' });
    const birthDate = birth.toLocaleDateString('ro-RO', { year: 'numeric', month: 'numeric', day: 'numeric' });
    const content = await ejs.renderFile("./document-templates/liquidation_form.ejs", { student, date, birthDate } );
    let fileBuffer = HtmlToPdf.generatePdf({ content }, HtmlToPdfOptions);
    return fileBuffer;
}