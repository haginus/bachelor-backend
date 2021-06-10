import archiver from 'archiver';
import stream from 'stream';
import * as DocumentController from '../controllers/document.controller';
import { Committee, Domain, Paper, SessionSettings, Specialization, Student, StudentExtraData, User } from '../models/models';
import ejs from 'ejs';
import fs from 'fs';
import mime from 'mime-types';
import { DOMAIN_TYPES } from './constants';
import { copyObject } from './util';
import { config } from '../config/config';


export const generateFinalReport = (): Promise<Buffer> => {
    return new Promise(async (resolve, reject) => {
        var bufferStream = new stream.PassThrough();
        let buffers = [];
        bufferStream.on('data', (data) => buffers.push(data));
        bufferStream.on('close', () => resolve(Buffer.concat(buffers)));

        const archive = archiver('zip', {
            zlib: { level: config.COMPRESSION_LEVEL } 
        });
        const committeeDocs = await getCommitteeDocuments();
        archive.append(committeeDocs.committeeCompositions, { name: `Comisii/Componeță comisii.pdf` });
        archive.append(committeeDocs.committeeStudents, { name: `Comisii/Repartizarea studenților pe comisii.pdf` });
        committeeDocs.list.forEach(committee => {
            archive.append(committee.catalog, { name: `Comisii/${committee.name}/Catalog.pdf` });
            archive.append(committee.finalCatalog, { name: `Comisii/${committee.name}/Catalog final.pdf` });
        });
        const studentLists = await generateStudentList();
        studentLists.forEach(domain => {
            archive.append(domain.list, { name: `Studenți/${domain.name}_${domain.type}/Listă.html` });
        });
        const studentDocs = await getStudentDataAndDocs();
        studentDocs.forEach(student => {
            const fullName = student.user.fullName;
            const domain = student.domain;
            const domainType = DOMAIN_TYPES[domain.type];
            let forJson = copyObject(student);
            delete forJson['docs'];
            archive.append(JSON.stringify(forJson, null, 4), 
                { name: `Studenți/${domain.name}_${domainType}/${student.group}_${fullName}/Date.json` });
            
            student.docs.forEach(doc => {
                archive.append(doc.buffer, 
                    { name: `Studenți/${domain.name}_${domainType}/${student.group}_${fullName}/${doc.title}.${doc.extension}` });
            });
        });
        archive.pipe(bufferStream);
        archive.finalize();
    });

}

const getCommitteeDocuments = async () => {
    const committees = await Committee.scope('min').findAll();
    let mockUser = { type: 'admin' } as User;
    let committeeStudents = await DocumentController.generateCommitteeStudents();
    let committeeCompositions = await DocumentController.generateCommitteeCompositions();
    let list = await Promise.all(committees.map(async (committee) => {
        let catalog = await DocumentController.generateCommitteeCatalog(mockUser, committee.id);
        let finalCatalog = await DocumentController.generateCommitteeFinalCatalog(mockUser, committee.id);
        return { name: committee.name, catalog, finalCatalog };
    }));
    return { committeeStudents, committeeCompositions, list }
}

const generateStudentList = async () => {
    const domains = await Domain.findAll({
        include: [{
            model: Student,
            include: [User, StudentExtraData, Specialization, Paper.scope(['teacher', 'grades', 'committee'])]
        }]
    });
    return Promise.all(domains.map(async domain => {
        const list = await ejs
            .renderFile(DocumentController.getDocumentTemplatePath("final-report/student_list"), { domain } );
        return { name: domain.name, type: DOMAIN_TYPES[domain.type], list };
    }));
}

const getStudentDataAndDocs = async () => {
    const students = await Student.findAll({
        include: [
            { model: User, attributes: { exclude: ['password'] } }, 
            Domain,
            StudentExtraData,
            Specialization,
            { model: Paper.scope(['documents', 'teacher', 'committee', 'grades']), required: true }
        ]
    });
    const sessionSettings = await SessionSettings.findOne();
    return Promise.all(students.map(async student => {
        const paper = student.paper;
        const requiredDocs = await DocumentController.getPaperRequiredDocuments(paper.id, sessionSettings);
        const docs = requiredDocs
            .map(reqDoc => {
                // get the latest document
                let actualArr = paper.documents
                    .filter(doc => doc.name == reqDoc.name)
                    .sort((d1, d2) => -(d1.id - d2.id));
                let actual = actualArr.length ? actualArr[0] : null;
                let buffer: Buffer = null;
                let extension = null;
                if(actual) {
                    extension = mime.extension(actual.mimeType);
                    buffer = fs.readFileSync(DocumentController.getStoragePath(`${actual.id}.${extension}`));
                }
                return { title: reqDoc.title, buffer, extension };
            })
            .filter(doc => doc.buffer != null);
        return { ...copyObject(student), docs };
    }));
    
}