import express from 'express';
import * as PaperController from '../controllers/paper.controller';
import isLoggedIn from './middlewares/isLoggedIn';

const router = express.Router();

router.use(isLoggedIn());

router.put('/:id', async (req, res, next) => {
  const { title, description, topicIds } = req.body;
  PaperController.editPaper(req._user, +req.params['id'], title, description, topicIds)
    .then((result) => res.json(result))
    .catch((err) => next(err));
});

router.post('/:id/submit', async (req, res, next) => {
  PaperController.submitPaper(req._user, +req.params['id'], true)
    .then((result) => res.json(result))
    .catch((err) => next(err));
});

router.post('/:id/unsubmit', async (req, res, next) => {
  PaperController.submitPaper(req._user, +req.params['id'], false)
    .then((result) => res.json(result))
    .catch((err) => next(err));
});

router.get('/:id/reupload-requests', async (req, res, next) => {
  PaperController.getDocumentReuploadRequests(req._user, +req.params['id'])
    .then((result) => res.json(result))
    .catch((err) => next(err));
});

export default router;