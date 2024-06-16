import { User, Student, Profile, sequelize } from "../models/models";
import imageThumbnail from 'image-thumbnail';
import { safePath, ResponseError, ResponseErrorInternal } from "../util/util";
import path from "path";
import fs from "fs";
import crypto from 'crypto';
import { config } from "../config/config";
import * as Mailer from '../mail/mailer';
import { Transaction } from "sequelize/types";

const getUser = async (where, transaction?: Transaction) => {
  return User.findOne({
    transaction,
    where,
    attributes: { exclude: ['password'] },
    include: [
      {
        association: User.associations.student,
        include: [
          Student.associations.domain,
          Student.associations.specialization,
          Student.associations.paper
        ]
      },
      User.associations.teacher]
  });
}

export async function validateUser(uid) {
  const user = await getUser({ id: uid });
  if (!user) {
    throw {
      status: 404,
      code: "USER_NOT_FOUND"
    }
  }
  if (user.validated) {
    throw {
      status: 400,
      code: "ALREADY_VALIDATED"
    }
  }

  user.validated = true;
  return user.save({ fields: ['validated'] });
}

export async function getUserData(uid: number, transaction?: Transaction) {
  return getUser(uid, transaction);
}

export async function patchProfile(user: User, picture: Buffer, bio: string, website: string) {
  let thumbnail: Buffer;
  if (picture) {
    try {
      thumbnail = await imageThumbnail(picture, {
        width: 128,
        height: 128,
        jpegOptions: {
          force: true,
          quality: 100
        },
        fit: 'cover',
        withMetaData: false
      } as any);
    } catch (err) {
      console.log(err)
      throw new ResponseError("Imaginea nu a putut fi procesată.");
    }
  }
  const transaction = await sequelize.transaction();
  let oldProfile = await user.getProfile();
  if(!oldProfile) oldProfile = await user.createProfile();
  if(bio != null) oldProfile.bio = bio;
  if(website != null) oldProfile.website = website;
  if(picture) {
    try {
      fs.unlinkSync(path.join(config.PROJECT_ROOT, oldProfile.picture))
    } catch(err) {
      // pass
    }
    const fileName = crypto.randomBytes(64).toString('hex') + ".jpeg";
    const picturePath = safePath(config.PROJECT_ROOT, 'static/profile', fileName);
    try {
      fs.writeFileSync(picturePath, thumbnail);
    } catch(err) {
      transaction.rollback();
      throw new ResponseErrorInternal();
    }
    oldProfile.picture = `/static/profile/${fileName}`;
  }
  try {
    await oldProfile.save({ transaction });
    await transaction.commit();
    return oldProfile;
  } catch(err) {
    transaction.rollback();
    throw new ResponseError("Câmpuri incorecte.");
  }
}

export async function sendFeedback(user: User, report: ProblemReport) {
  if(!["data", "feedback", "bug", "question"].includes(report.type)) {
    throw new ResponseError("Tip mesaj incorect.");
  }
  if(!user) {
    if(!report.fullName) {
      throw new ResponseError("Numele trebuie introdus pentru utilizatorii neautentificați.");
    }
    const parts = report.fullName.split(' ');
    if(parts.length < 2) {
      throw new ResponseError("Introduceți numele întreg.");
    }
    const lastName = parts[0];
    const firstName = parts.slice(1).join(' ');
    user = { firstName, lastName } as User;
  }
  await Mailer.sendFeedbackMail(user, report);
  return report;
}

export interface ProblemReport {
  type: string;
  description: string;
  email: string;
  fullName?: string;
}