import archiver from 'archiver';
import stream from 'stream';
import * as DocumentController from '../controllers/document.controller';
import { Committee, Domain, Paper, SessionSettings, Specialization, Student, StudentExtraData, User } from '../models/models';
import ejs from 'ejs';
import fs from 'fs';
import os from 'os';
import mime from 'mime-types';
import { DOMAIN_TYPES } from './constants';
import { copyObject, ResponseError, ResponseErrorUnauthorized, safePath } from './util';
import { config } from '../config/config';
import jwt from "jsonwebtoken";

export let finalReportGenerationStatus = {
    isGenerating: false,
    progress: 0,
    lastGeneratedOn: null as number,
    lastReportPath: null as string
}

export function getLatestReportAccessToken() {
    const reportPath = finalReportGenerationStatus.lastReportPath;
    if(reportPath == null) {
        throw new ResponseError("Nu este niciun raport de accesat.");
    }
    const token = jwt.sign({ reportPath }, config.SECRET_KEY, { expiresIn: 60 });
    return { token };
}

export function getGerationStatus() {
    return finalReportGenerationStatus;
}

export function getReport(token: string): string {
    try {
        const payload = jwt.verify(token, config.SECRET_KEY);
        if(payload['reportPath'] != finalReportGenerationStatus.lastReportPath) throw '';
        return finalReportGenerationStatus.lastReportPath;
    } catch(e) {
        throw new ResponseErrorUnauthorized();
    }

}

/**
 * 
 * @returns path to the report
 */
export const generateFinalReport = (): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        console.log('Report generation started...');
        finalReportGenerationStatus = {
            isGenerating: true,
            progress: 0,
            lastGeneratedOn: Date.now(),
            lastReportPath: null
        }
        const destination = safePath(os.tmpdir(), `/bachelor-backend/${Date.now()}.zip`);
        console.log("Temporary report location: ", destination);
        let bufferStream = fs.createWriteStream(destination);

        bufferStream.on('close', () => {
            console.log("Report generation finished. File available at:", destination);
            finalReportGenerationStatus = {
                isGenerating: false,
                progress: 1,
                lastGeneratedOn: Date.now(),
                lastReportPath: destination
            }
            resolve(destination);
        });

        const archive = archiver('zip', {
            zlib: { level: config.COMPRESSION_LEVEL } 
        });

        let totalSize: number = 0;
        const committeeDocs = await getCommitteeDocuments();
        archive.append(committeeDocs.committeeCompositions, { name: `Comisii/Componeță comisii.pdf` });
        archive.append(committeeDocs.committeeStudents, { name: `Comisii/Repartizarea studenților pe comisii.pdf` });
        committeeDocs.list.forEach(committee => {
            archive.append(committee.catalog, { name: `Comisii/${committee.name}/Catalog.pdf` });
            archive.append(committee.finalCatalog, { name: `Comisii/${committee.name}/Catalog final.pdf` });
            totalSize += committee.catalog.length;
            totalSize += committee.finalCatalog.length;
        });
        const studentLists = await generateStudentList();
        studentLists.forEach(domain => {
            archive.append(domain.list, { name: `Studenți/${domain.name}_${domain.type}/Listă.html` });
            totalSize += domain.list.length;
        });
        const studentDocs = await getStudentDataAndDocs();
        const studentDocsTotal = studentDocs.length;
        studentDocs.forEach(({ docs, ...student}, index) => {
            console.log("Preparing data for student %s / %s", index + 1, studentDocsTotal);
            const fullName = student.user.fullName;
            const domain = student.domain;
            const domainType = DOMAIN_TYPES[domain.type];
            let forJson = copyObject(student);
            archive.append(JSON.stringify(forJson, null, 4), 
                { name: `Studenți/${domain.name}_${domainType}/${student.group}_${fullName}/Date.json` });
            
            docs.forEach(doc => {
                archive.append(doc.buffer, 
                    { name: `Studenți/${domain.name}_${domainType}/${student.group}_${fullName}/${doc.title}.${doc.extension}` });
                totalSize += doc.buffer.length;
            });
        });

        archive.on('progress', (progress) => {
            let percent = progress.entries.processed / progress.entries.total;
            let pseudoSize = totalSize * percent;
            let percentStr = (percent * 100).toFixed(2);
            finalReportGenerationStatus.progress = percent;
            console.log('%s / %s (%d %) -- %s / %s entries', bytesToSize(pseudoSize), bytesToSize(totalSize), percentStr, progress.entries.processed, progress.entries.total);
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
    console.log('Getting student data and docs...');
    const students = await Student.findAll({
        include: [
            { model: User, attributes: { exclude: ['password'] } }, 
            Domain,
            StudentExtraData,
            Specialization,
            { 
                model: Paper.scope(['documents', 'teacher', 'committee', 'grades']),
                required: true
            }
        ]
    });
    const sessionSettings = await SessionSettings.findOne();
    const result = await Promise.all(students.map(async student => {
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
    console.log('Getting student data and docs... OK!');
    return result;
}

function bytesToSize(bytes: number) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0 Byte';
    let i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
};