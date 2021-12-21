import express from 'express';
import *  as _ from './custom'
import bodyParser from 'body-parser';
import cors from 'cors';
import authRoutes from './routes/auth.route';
import studentRoutes from './routes/students.route';
import teacherRoutes from './routes/teacher.route';
import topicsRoutes from './routes/topics.route';
import adminRoutes from './routes/admin.route';
import documentsRoutes from './routes/documents.route';
import devRoutes from './routes/dev.route';
import { config } from './config/config';
import { copyObject } from './util/util';

import isLoggedIn from './routes/middlewares/isLoggedIn';
import errorHandler from './routes/middlewares/errorHandler';
import path from 'path';

const app = express();
app.use(cors(config.CORS));
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

app.use('/auth', authRoutes);
app.use('/student', studentRoutes);
app.use('/teacher', teacherRoutes);
app.use('/topics', topicsRoutes);
app.use('/admin', adminRoutes);
app.use('/documents', documentsRoutes);
app.use('/static', express.static(path.join(config.PROJECT_ROOT, 'static')));

if(!config.IS_PROD) {
  app.use('/test', devRoutes);
}

app.use(errorHandler());

app.use((req, res) => {
  if (req.accepts('html')) {
    res.redirect(config.WEBSITE_URL);
  } else if (req.accepts('json')) {
    res.status(404).send({ message: 'Resursa cerută nu există.' });
    return;
  } else {
    res.status(404).send("Resursa cerută nu există.");
  }
});

// start app
app.listen(config.PORT, function () {
  console.log(`Express is running on port ${config.PORT}`);
});
