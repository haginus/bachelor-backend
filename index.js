const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { User, Topic, Student, Domain, StudentExtraData } = require('./models/models');
const AuthController = require('./controllers/auth.controller')
const UserController = require('./controllers/user.controller')
const authRoutes = require('./routes/auth')
const studentRoutes = require('./routes/students')
const teacherRoutes = require('./routes/teacher')
const topicsRoutes = require('./routes/topics')
const adminRoutes = require('./routes/admin')
const documentsRoutes = require('./routes/documents')
const { config } = require('./config/config')
const Mailer = require('./alerts/mailer');


const app = express();
app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const delay = async function(req, res, next) {
  await new Promise((res, rej) => {
    setTimeout(res, 1000);
  });
  next();
}

if(config.MAKE_DELAY)
  app.use(delay);


app.get('/pop', async function (req, res) {
  let domain = await Domain.create({ name: "Informatică", type: "bachelor" });
  let user = await User.create({ firstName: "Andrei", lastName: "Hagi", CNP: "1990808xxxxxx", email: "hagiandrei.ah@gmail.com", password: "123456", type: 'student' });
  let student = await Student.create({ group: "331" });
  await student.setDomain(domain);
  await student.setUser(user);

  let topic1 = await Topic.create({ name: "Criptografie și securitate" });
  let topic2 = await Topic.create({ name: "Sisteme de operare" });
  let topic3 = await Topic.create({ name: "Inteligență artificială" });
  let topic4 = await Topic.create({ name: "Programare declarativă" });

  await student.addTopics([ topic1, topic2, topic3, topic4 ]);
  return res.status(200).json({ ok: true });
});

app.get('/test', function (req, res) {
  User.findAll({
    include: [
      { model: Student, attributes: { exclude: ["password"] }, include: [
        { model: Domain },
        { model: Topic,
          attributes: ["id", "name"],
          through: {
            attributes: []
          }
        }
      ]}
    ]
  }).then(users => res.json(users));
})

// protected route
app.get('/protected', AuthController.isLoggedIn, function (req, res) {
  res.json(req._user);
});

app.get('/email', function (req, res) {
  Mailer.sendRejectedApplicationEmail(
    {
      firstName: 'Andrei',
      lastName: 'Hagi',
      email: 'hagi@fmi.ro'
    },
    {
      firstName: 'Ana',
      lastName: 'Turlea',
      email: 'hagi@fmi.ro'
    },
    {
      title: "Getting to know your things."
    }
  )
  res.json("");
});

app.get('/extra', function (req, res) {
  StudentExtraData.findAll().then(r => res.json(r))
});


/*
app.get('/user/:userId', AuthController.isLoggedIn, function (req, res) {
  const userId = req.params.userId;
  if (userId != req._user.id) {
    return res.status(403).json({ "error": "NOT_AUTHORIZED" });
  }
  res.json(req._user);
}); */

app.get('/user/info', AuthController.isLoggedIn, async (req, res) => {
  let user = await UserController.getUserData(req._user.id);
  res.json(user);
});

app.use('/auth', authRoutes);
app.use('/student', studentRoutes);
app.use('/teacher', teacherRoutes);
app.use('/topics', topicsRoutes);
app.use('/admin', adminRoutes);
app.use('/documents', documentsRoutes);


// start app
app.listen(config.PORT, function () {
  console.log('Express is running on port 3000');
});
