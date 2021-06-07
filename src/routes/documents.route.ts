import express from 'express';
const router = express.Router();
import * as DocumentController from '../controllers/document.controller';
import { ResponseError, ResponseErrorUnauthorized } from '../util/util';
import isLoggedIn from './middlewares/isLoggedIn';
import isType from './middlewares/isType';

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

router.get('/committee/:document', isType(['admin', 'teacher']), async (req, res, next) => {
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

// router.get('/test', async (req, res) => {
//     res.contentType("application/pdf");
//     let r = await DocumentController.generateCommitteeCompositions();
//     res.send(r);
// })

export default router