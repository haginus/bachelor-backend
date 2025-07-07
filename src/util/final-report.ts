import archiver from 'archiver';
import stream from 'stream';
import * as DocumentController from '../controllers/document.controller';
import { Committee, Domain, Paper, SessionSettings, Specialization, Student, StudentExtraData, User } from '../models/models';
import ejs from 'ejs';
import fs from 'fs';
import os from 'os';
import mime from 'mime-types';
import { DOMAIN_TYPES } from './constants';
import { copyObject, ResponseError, ResponseErrorUnauthorized, safePath, sortArr } from './util';
import { config } from '../config/config';
import jwt from "jsonwebtoken";
import { Op } from 'sequelize';
import { ServerSentEventsHandler } from './sse';
import { LogsController } from '../controllers/logs.controller';

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
export const generateFinalReport = (sseHandler?: ServerSentEventsHandler): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        console.log('Report generation started...');
        const progressTracker = new ProgressTracker(sseHandler);
        const destination = safePath(os.tmpdir(), `/bachelor-backend/${Date.now()}.zip`);
        console.log("Temporary report location: ", destination);
        let bufferStream = fs.createWriteStream(destination);

        bufferStream.on('close', () => {
            console.log("Report generation finished. File available at:", destination);
            progressTracker.finish(destination);
            resolve(destination);
        });

        const archive = archiver('zip', {
            zlib: { level: config.COMPRESSION_LEVEL } 
        });

        let totalSize: number = 0;
        let processedEntries = 0;

        const { rows: logs } = await LogsController.findAll({ limit: '100000000000' });
        archive.append(JSON.stringify(logs, (k, v) => (v === null ? undefined : v), 2), { name: 'Loguri.json' });

        const centralizingCatalog = await DocumentController.generateFinalCatalog('centralizing');
        const finalCatalog = await DocumentController.generateFinalCatalog('final');
        archive.append(centralizingCatalog, { name: `Catalog centalizator.pdf` });
        archive.append(finalCatalog, { name: `Catalog final.pdf` });
        totalSize += centralizingCatalog.length;
        totalSize += finalCatalog.length;

        const committeeDocs = await getCommitteeDocuments(progressTracker);
        archive.append(committeeDocs.committeeCompositions, { name: `Comisii/Componeță comisii.pdf` });
        archive.append(committeeDocs.committeeStudents, { name: `Comisii/Repartizarea studenților pe comisii.pdf` });
        committeeDocs.list.forEach(committee => {
            archive.append(committee.catalog, { name: `Comisii/${committee.name}/Catalog.pdf` });
            archive.append(committee.catalog_docx, { name: `Comisii/${committee.name}/Catalog.docx` });
            archive.append(committee.finalCatalog, { name: `Comisii/${committee.name}/Catalog final.pdf` });
            totalSize += committee.catalog.length;
            totalSize += committee.catalog_docx.length;
            totalSize += committee.finalCatalog.length;
        });
        const studentLists = await generateStudentList();
        progressTracker.bumpProgress(0.1);
        studentLists.forEach(domain => {
            archive.append(domain.list, { name: `Studenți/${domain.name}_${domain.type}/Listă.html` });
            totalSize += domain.list.length;
        });
        const studentDocs = await getStudentDataAndDocs(progressTracker);
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
            /** Archieving gets 50% of the progress */
            progressTracker.bumpProgress(0.5 * ((progress.entries.processed - processedEntries) / progress.entries.total));
            console.log('%s / %s (%d %) -- %s / %s entries', bytesToSize(pseudoSize), bytesToSize(totalSize), percentStr, progress.entries.processed, progress.entries.total);
            processedEntries = progress.entries.processed;
        });

        archive.pipe(bufferStream);
        archive.finalize();
    });

}

const getCommitteeDocuments = async (progressTracker: ProgressTracker) => {
    const committees = await Committee.scope('min').findAll();
    const progressPerCommittee = 0.3 * 1 / (committees.length + 2); // +2 for committee students and compositions
    let mockUser = { type: 'admin' } as User;
    let committeeStudents = await DocumentController.generateCommitteeStudents();
    progressTracker.bumpProgress(progressPerCommittee);
    let committeeCompositions = await DocumentController.generateCommitteeCompositions();
    progressTracker.bumpProgress(progressPerCommittee);
    let list: { name: string, catalog: Buffer, catalog_docx: Buffer, finalCatalog: Buffer }[] = [];
    for(const committee of committees) {
        console.log(`Generating documents for committee ${committee.name} (ID: ${committee.id})...`);
        const listItem = {
            name: committee.name, 
            catalog: await DocumentController.generateCommitteeCatalog(mockUser, committee.id),
            catalog_docx: await DocumentController.generateCommitteeCatalogWord(mockUser, committee.id),
            finalCatalog: await DocumentController.generateCommitteeFinalCatalog(mockUser, committee.id),
        };
        list.push(listItem);
        console.log(`Documents for committee ${committee.name} (ID: ${committee.id}) generated.`);
        progressTracker.bumpProgress(progressPerCommittee);
    }
    return { committeeStudents, committeeCompositions, list }
}

const generateStudentList = async () => {
    const domains = await Domain.findAll({
        include: [{
            model: Student,
            include: [
                User,
                StudentExtraData,
                Specialization,
                {
                    model: Paper.scope(['teacher', 'grades', 'committee']),
                    where: { committeeId: { [Op.ne]: null }}
                }
            ]
        }]
    });
    domains.forEach(domain => {
        sortArr(domain.students, [
            (a, b) => a.specialization.name.localeCompare(b.specialization.name),
            (a, b) => a.group.localeCompare(b.group),
            (a, b) => a.user.fullName.localeCompare(b.user.fullName),
        ]);
    })
    return Promise.all(domains.map(async domain => {
        const list = await ejs
            .renderFile(DocumentController.getTemplatePath("final-report/student_list"), { domain } );
        return { name: domain.name, type: DOMAIN_TYPES[domain.type], list };
    }));
}

const getStudentDataAndDocs = async (progressTracker: ProgressTracker) => {
    console.log('Getting student data and docs...');
    const students = await Student.findAll({
        include: [
            { model: User, attributes: { exclude: ['password'] } }, 
            Domain,
            StudentExtraData,
            Specialization,
            { 
                model: Paper.scope(['documents', 'teacher', 'committee', 'grades']),
                required: true,
                where: { committeeId: { [Op.ne]: null }}
            }
        ]
    });
    const sessionSettings = await SessionSettings.findOne();
    const progressPerStudent = 0.1 * 1 / students.length;
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
        setTimeout(() => progressTracker.bumpProgress(progressPerStudent), 0);
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

class ProgressTracker {
    finalReportGenerationStatus: typeof finalReportGenerationStatus;
    constructor(public sseHandler?: ServerSentEventsHandler) {
        this.finalReportGenerationStatus = finalReportGenerationStatus;
        Object.assign(this.finalReportGenerationStatus, {
            isGenerating: true,
            progress: 0,
            lastGeneratedOn: Date.now(),
            lastReportPath: null,
        });
        sseHandler?.emitMessage(this.finalReportGenerationStatus);
    }

    setProgress(progress: number) {
        this.finalReportGenerationStatus.progress = Math.round(progress * 100) / 100;
        this.sseHandler?.emitMessage(this.finalReportGenerationStatus);
    }

    bumpProgress(progress: number) {
        return this.setProgress(this.finalReportGenerationStatus.progress + progress);
    }

    finish(reportPath: string) {
        this.finalReportGenerationStatus.isGenerating = false;
        this.finalReportGenerationStatus.progress = 1;
        this.finalReportGenerationStatus.lastGeneratedOn = Date.now();
        this.finalReportGenerationStatus.lastReportPath = reportPath;
        this.sseHandler?.emitMessage(this.finalReportGenerationStatus);
    }
}