import express from 'express';
const router = express.Router();
import * as DocumentController from '../controllers/document.controller';
import * as AuthController from '../controllers/auth.controller';

router.use(AuthController.isLoggedIn);

router.get('/view', async (req, res) => {
    let { id } = req.query;
    try {
        let buffer = await DocumentController.getDocument(req._user, +id);
        res.send(buffer);
    } catch(err) {
        console.log(err)
        res.status(400).json(err);
    }
});

router.post('/delete', async (req, res) => {
    let { id } = req.body;
    try {
        await DocumentController.deleteDocument(req._user, +id);
        res.json({ success: true });
    } catch(err) {
        res.status(400).json(err);
    }
});

router.get('/committee/:document', async (req, res) => {
    try {
        const { document } = req.params;
        let { committeeId } = req.query;
        if(!document || !committeeId) {
            throw "BAD_REQUEST";
        }

        // Only teachers and admins can download.
        if(!['admin', 'teacher'].includes(req._user.type)) {
            throw "NOT_AUTHORIZED";
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
                throw "BAD_REQUEST";
        }
        res.send(buffer);
    } catch(err) {
        console.log(err)
        res.status(400).json(err);
    }
});

export default router