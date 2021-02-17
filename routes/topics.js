var express = require('express')
var router = express.Router()
const AuthController = require('../controllers/auth.controller')
const TopicController = require('../controllers/topic.controller')

router.get('/', AuthController.isLoggedIn, async function (req, res) {
    try {
        const topics = await TopicController.getTopics();
        res.json(topics);
    } catch (err) {
        return res.status(400).json("INTERNAL_ERROR");
    }
});

module.exports = router