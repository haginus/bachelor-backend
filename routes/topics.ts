var express = require('express')
var router = express.Router()
import * as AuthController from '../controllers/auth.controller'
import * as TopicController from '../controllers/topic.controller'

router.use(AuthController.isLoggedIn)

router.get('/', async function (req, res) {
    try {
        const topics = await TopicController.getTopics();
        res.json(topics);
    } catch (err) {
        return res.status(400).json("INTERNAL_ERROR");
    }
});

router.post('/add', async function (req, res) {
    if(!['admin', 'teacher'].includes(req._user.type)) {
        return res.status(403).json("UNAUTHORIZED");
    }
    const { name } = req.body;
    if(!name || typeof name != "string") {
        return res.status(400).json("BAD_REQUEST");
    }
    try {
        const topic = await TopicController.addTopic(name);
        return res.json(topic);
    } catch (err) {
        return res.status(400).json("TOPIC_ALREADY_EXISTS");
    }
});

router.post('/add-bulk', async function (req, res) {
    if(!['admin', 'teacher'].includes(req._user.type)) {
        return res.status(403).json("UNAUTHORIZED");
    }
    const { names } = req.body;
    if(!names || typeof names != "object") {
        return res.status(400).json("BAD_REQUEST");
    }
    try {
        const topic = await TopicController.addTopics(names);
        return res.json(topic);
    } catch (err) {
        return res.status(400).json("TOPIC_ALREADY_EXISTS");
    }
});

export default router