const { Document, Paper, sequelize } = require("../models/models.js");
const ejs = require('ejs');
const HtmlToPdf = require('html-pdf-node');
const fs = require('fs')
const path = require('path')
const mime = require('mime-types');

const HtmlToPdfOptions = { format: 'A4' };

const getStoragePath = (fileName) => {
    return path.resolve(process.env.PWD, 'storage', 'documents', fileName);
}

exports.getDocument = async (user, documentId) => {
    const document = await Document.findOne({
        where: { id: documentId },
        include: [{
            model: Paper,
            required: true
        }]
    });
    if(!document) {
        throw "NOT_FOUND";
    }
    if(!(document.paper.studentId == user.student.id || user.type == 'admin')) {
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

exports.generateDocument = (name, data) => {
    if(name == 'sign_up_form') {
        return generateSignUpForm(data);
    }
    throw "INVALID_DOCUMENT_NAME";
}

const generateSignUpForm = async (student) => {
    const content = await ejs.renderFile("./document-templates/sign_up_form.ejs", { student } );
    let fileBuffer = HtmlToPdf.generatePdf({ content }, HtmlToPdfOptions);
    return fileBuffer;
}