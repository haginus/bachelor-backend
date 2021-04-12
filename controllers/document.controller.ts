import { Document, Paper, sequelize } from "../models/models";
import ejs from 'ejs';
import HtmlToPdf from 'html-pdf-node';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

const HtmlToPdfOptions = { format: 'A4' };

export const getStoragePath = (fileName: string) => {
    return path.resolve(process.env.PWD, 'storage', 'documents', fileName);
}

export const getDocument = async (user, documentId) => {
    const document = await Document.findOne({
        where: { id: documentId },
        include: [{
            model: sequelize.model('paper'),
            required: true
        }]
    });
    if(!document) {
        throw "NOT_FOUND";
    }
    if(!(document.paper.studentId == user.student?.id || user.type == 'admin')) {
        throw "NOT_AUTHORIZED";
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