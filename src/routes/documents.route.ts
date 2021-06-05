import express from 'express';
const router = express.Router();
import * as DocumentController from '../controllers/document.controller';
import * as AuthController from '../controllers/auth.controller';
import { ResponseError, ResponseErrorUnauthorized } from '../util/util';

router.use(AuthController.isLoggedIn);

router.get('/view', async (req, res, next) => {
    let { id } = req.query;
    let buffer = await DocumentController.getDocument(req._user, +id)
        .catch(err => next(err));
    res.send(buffer);
});

router.post('/delete', async (req, res, next) => {
    let { id } = req.body;
    await DocumentController.deleteDocument(req._user, +id)
        .catch(err => next(err));
    res.json({ success: true });
});

router.get('/committee/:document', async (req, res, next) => {
    try {
        const { document } = req.params;
        let { committeeId } = req.query;
        if(!document || !committeeId) {
            throw new ResponseError('Parametri lipsă.');
        }

        // Only teachers and admins can download.
        if(!['admin', 'teacher'].includes(req._user.type)) {
            throw new ResponseErrorUnauthorized();
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