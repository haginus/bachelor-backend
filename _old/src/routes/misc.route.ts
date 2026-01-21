import express from 'express';
import isLoggedIn from './middlewares/isLoggedIn';
const router = express.Router();
import * as UserController from '../controllers/user.controller';
import * as AdminController from '../controllers/admin.controller';

router.post("/feedback", isLoggedIn({ optional: true }), (req, res, next) => {
  UserController.sendFeedback(req._user, req.body)
    .then(result => res.json(result))
    .catch(err => next(err));
});

router.get("/domains", (req, res, next) => {
  AdminController.getDomains()
    .then(result => res.json(result))
    .catch(err => next(err));
});

export default router;
