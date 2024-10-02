import express from 'express';
const router = express.Router();
import * as DocumentController from '../controllers/document.controller';
import { ResponseError, ResponseErrorUnauthorized } from '../util/util';
import isLoggedIn from './middlewares/isLoggedIn';
import isType from './middlewares/isType';
import fileUpload, { UploadedFile } from 'express-fileupload';

router.use(isLoggedIn());

router.get('/view', (req, res, next) => {
    let { id } = req.query;
    DocumentController.getDocument(req._user, +id)
        .then(buffer => res.send(buffer))
        .catch(err => next(err));
});

router.post('/delete', async (req, res, next) => {
    let { id } = req.body;
    DocumentController.deleteDocument(req._user, +id)
        .then(result => res.json({ success: true }))
        .catch(err => next(err));
});

router.post('/upload', fileUpload({ limits: { fileSize: 100 * 1024 * 1024 } }), function(req, res, next) {
    const { name, type, paperId } = req.body;
    DocumentController.uploadPaperDocument(req._user, req.files.file as UploadedFile, name, type, +paperId)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.post('/sign', function(req, res, next) {
    const { name, paperId } = req.body;
    DocumentController.signPaperDocument(req._user, name, +paperId)
        .then(result => res.json(result))
        .catch(err => next(err));
});

router.get('/committee/:document', isType(['admin', 'secretary', 'teacher']), async (req, res, next) => {
    try {
        const { document } = req.params;
        let { committeeId } = req.query;
        if(!document || !committeeId) {
            throw new ResponseError('Parametri lipsă.');
        }
        let buffer: Buffer;
        switch(document) {
            case 'catalog':
                buffer = await DocumentController.generateCommitteeCatalog(req._user, +committeeId);
                break;
            case 'catalog_docx':
                buffer = await DocumentController.generateCommitteeCatalogWord(req._user, +committeeId);
                break;
            case 'final_catalog':
                buffer = await DocumentController.generateCommitteeFinalCatalog(req._user, +committeeId);
                break;
            default:
                throw new ResponseError('Documentul nu există.');
        }
        res.send(buffer);
    } catch(err) {
        next(err);
    }
});

router.get('/final_catalog', isType(['admin', 'secretary']), (req, res, next) => {
    let { mode, format } = req.query;
    mode = mode || 'final';
    format = format || 'pdf';
    if(!['centralizing', 'final'].includes(mode as string)) {
        throw new ResponseError('Parametrul de mod este incorect.');
    }
    if(!['pdf', 'docx'].includes(format as string)) {
        throw new ResponseError('Format invalid. Valori acceptate: pdf,docx');
    }
    DocumentController.generateFinalCatalog(mode as any, format as any)
        .then(result => res.send(result))
        .catch(err => next(err));
});

// router.get('/test', async (req, res) => {
//     res.contentType("application/pdf");
//     let r = await DocumentController.generateCommitteeCompositions();
//     res.send(r);
// })

export default router