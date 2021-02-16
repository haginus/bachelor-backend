const express = require('express');
const bodyParser = require('body-parser');
const { User, Topic } = require('./models/models');
const AuthController = require('./controllers/auth.controller')


const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/test', function (req, res) {
  User.findAll({
    attributes: { exclude: ["password"] },
    include: [
      { model: Topic, attributes: ['id', 'name',] }
    ]
  }).then(users => res.json(users));
})

app.post('/login', AuthController.login);

const mw = function (opt) {
  return function (req, res, next) {
    if (opt.foo) {
      console.log(process.env);
      next();
    }
    res.status(401);
  }
}

// protected route
app.get('/protected', AuthController.isLoggedIn, function (req, res) {
  res.json(req._user);
});

app.get('/user/:userId', AuthController.isLoggedIn, function (req, res) {
  const userId = req.params.userId;
  if (userId != req._user.id) {
    return res.status(403).json({ "error": "NOT_AUTHORIZED" });
  }
  res.json(req._user);
});

// start app
app.listen(3000, function () {
  console.log('Express is running on port 3000');
});
