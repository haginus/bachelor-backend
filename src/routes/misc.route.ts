import express from 'express';
import isLoggedIn from './middlewares/isLoggedIn';
const router = express.Router();
import * as UserController from '../controllers/user.controller';

router.post("/feedback", isLoggedIn({ optional: true }), (req, res, next) => {
  UserController.sendFeedback(req._user, req.body)
    .then(result => res.json(result))
    .catch(err => next(err));
});

export default router;
