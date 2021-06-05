import express from 'express'
const router = express.Router()
import * as AuthController from '../controllers/auth.controller'
import * as TopicController from '../controllers/topic.controller'
import { ResponseError, ResponseErrorUnauthorized } from '../util/util'

router.use(AuthController.isLoggedIn)

router.get('/', async function (req, res, next) {
    const topics = await TopicController.getTopics()
        .catch(err => next(err));
    res.json(topics);
});

router.post('/add', async function (req, res, next) {
    if(!['admin', 'teacher'].includes(req._user.type)) {
        return next(new ResponseErrorUnauthorized());
    }
    const { name } = req.body;
    if(!name || typeof name != "string") {
        return next(new ResponseError('Numele temei lipsește.'));
    }
    const topic = await TopicController.addTopic(name)
        .catch(err => next(err));
    return res.json(topic);
});

router.post('/add-bulk', async function (req, res, next) {
    if(!['admin', 'teacher'].includes(req._user.type)) {
        return next(new ResponseErrorUnauthorized());
    }
    const { names } = req.body;
    if(!names || !Array.isArray(names)) {
        return next(new ResponseError('Numele temelor lipsesc.'));
    }
    const topics = await TopicController.addTopics(names)
        .catch(err => next(err));
    return res.json(topics);
});

export default router