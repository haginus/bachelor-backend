import express from 'express';
import *  as _ from './custom'
import bodyParser from 'body-parser';
import cors from 'cors';
import * as AuthController from './controllers/auth.controller';
import * as UserController from './controllers/user.controller';
import authRoutes from './routes/auth';
import studentRoutes from './routes/students';
import teacherRoutes from './routes/teacher';
import topicsRoutes from './routes/topics';
import adminRoutes from './routes/admin';
import documentsRoutes from './routes/documents';
import { config } from './config/config';
import * as Mailer from './alerts/mailer';


const app = express();
app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const delay = async function(req, res, next) {
  await new Promise((res, rej) => {
    setTimeout(res, 200);
  });
  next();
}

if(config.MAKE_DELAY)
  app.use(delay);


app.get('/test', AuthController.isLoggedIn, async function (req, res) {
  //const teacher = await Teacher.findOne({where: {id: 8 } });

  //teacher.getCommittees().then(users => res.json(users));
  req._user.student.getPaper().then(users => res.json(users));
})

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
