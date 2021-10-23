import express from 'express';
import *  as _ from './custom'
import bodyParser from 'body-parser';
import cors from 'cors';
import * as AuthController from './controllers/auth.controller';
import authRoutes from './routes/auth.route';
import studentRoutes from './routes/students.route';
import teacherRoutes from './routes/teacher.route';
import topicsRoutes from './routes/topics.route';
import adminRoutes from './routes/admin.route';
import documentsRoutes from './routes/documents.route';
import { config } from './config/config';
import * as Mailer from './alerts/mailer';
import { ResponseError } from './util/util';
import { ValidationError } from 'sequelize';

import isLoggedIn from './routes/middlewares/isLoggedIn';
import errorHandler from './routes/middlewares/errorHandler';

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

app.get('/user/info', isLoggedIn(), async (req, res) => {
  let user = req._user;
  res.json(user);
});

app.use('/auth', authRoutes);
app.use('/student', studentRoutes);
app.use('/teacher', teacherRoutes);
app.use('/topics', topicsRoutes);
app.use('/admin', adminRoutes);
app.use('/documents', documentsRoutes);
app.use(errorHandler());

// start app
app.listen(config.PORT, function () {
  console.log(`Express is running on port ${config.PORT}`);
});
