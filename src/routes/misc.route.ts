import express from 'express';
import isLoggedIn from './middlewares/isLoggedIn';
const router = express.Router();
import * as UserController from '../controllers/user.controller';
import validateDto from './middlewares/validateDto';
import { ProblemReportDto } from '../dto/ProblemReportDto';

router.post("/feedback", isLoggedIn(), validateDto(ProblemReportDto), (req, res, next) => {
  UserController.sendFeedback(req._user, req.body)
    .then(teacherOffers => res.json(teacherOffers))
    .catch(err => next(err));
});

export default router;
