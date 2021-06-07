import express from 'express'
const router = express.Router()
import * as TopicController from '../controllers/topic.controller'
import isLoggedIn from './middlewares/isLoggedIn';
import isType from './middlewares/isType';

router.use(isLoggedIn());

router.get('/', function (req, res, next) {
    TopicController.getTopics()
        .then(topics => res.json(topics))
        .catch(err => next(err));
});

router.post('/add', isType(['admin', 'teacher']), function (req, res, next) {
    const { name } = req.body;
    TopicController.addTopic(name)
        .then(topic => res.json(topic))
        .catch(err => next(err));
});

router.post('/add-bulk', isType(['admin', 'teacher']), async (req, res, next) => {
    const { names } = req.body;
    TopicController.addTopics(names)
        .then(topics => res.json(topics))
        .catch(err => next(err));
});

export default router