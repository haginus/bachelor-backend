import express from 'express';
import isLoggedIn from './middlewares/isLoggedIn';
import isType from './middlewares/isType';
import { LogsController } from '../controllers/logs.controller';

const router = express.Router();
router.use(isLoggedIn());
router.use(isType('admin'));

router.get('/', (req, res, next) => {
  LogsController.findAll(req.query as any)
    .then(result => res.json(result))
    .catch(err => next(err));
});

export default router;