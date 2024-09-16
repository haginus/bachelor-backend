import express from 'express';
import isLoggedIn from './middlewares/isLoggedIn';
import { SignaturesController } from '../controllers/signatures.controller';
import fileUpload, { UploadedFile } from 'express-fileupload';

const router = express.Router();
router.use(isLoggedIn());

router.get('/me', (req, res, next) => {
  SignaturesController.findOneByUser(req._user)
    .then(result => res.json(result))
    .catch(err => next(err));
});

router.put('/me', fileUpload(), (req, res, next) => {
  let sample = (req.files?.sample as UploadedFile)?.data;
  SignaturesController.createOrUpdate(req._user.id, sample)
    .then(result => res.json(result))
    .catch(err => next(err));
});

router.get('/:id', (req, res, next) => {
  SignaturesController.findOne(+req.params.id, req._user)
    .then(result => res.json(result))
    .catch(err => next(err));
});

router.get('/:id/sample', (req, res, next) => {
  SignaturesController.getSample(+req.params.id, req._user)
    .then(buffer => res.send(buffer))
    .catch(err => next(err));
});



export default router;