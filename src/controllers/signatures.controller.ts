import sharp from "sharp";
import { config } from "../config/config";
import { sequelize, Signature, User } from "../models/models";
import { ResponseError, ResponseErrorForbidden, ResponseErrorInternal, safePath } from "../util/util";
import fs from "fs";

export class SignaturesController {

  private static getStoragePath(fileName: string) {
    return safePath(config.PROJECT_ROOT, 'storage', 'signature-samples', fileName);
  }

  static async findOneByUser(user: User) {
    return SignaturesController.findOneByUserId(user.id);
  }

  static async findOneByUserId(userId: number, user?: User) {
    if(user && user.type !== 'admin' && userId !== user.id) {
      throw new ResponseErrorForbidden();
    }
    return Signature.findOne({ 
      where: {
        userId,
      }
    });
  }

  static async findOne(id: number, user?: User) {
    const signature = await Signature.findByPk(id);
    if(user && user.type !== 'admin' && signature.userId !== user.id) {
      throw new ResponseErrorForbidden();
    }
    return signature;
  }

  static async getSample(id: number, user?: User) {
    const signature = await SignaturesController.findOne(id, user);
    try {
      let buffer = fs.readFileSync(SignaturesController.getStoragePath(`${signature.id}.png`));
      return buffer;
    } catch (err) {
      console.log(err)
      throw new ResponseErrorInternal();
    }
  }

  static async createOrUpdate(userId: number, sample: Buffer) {
    try {
      const image = sharp(sample);
      const metadata = await image.metadata();
      if(
        metadata.format !== 'png' || 
        metadata.width !== 270 || 
        metadata.height !== 130 || 
        metadata.size > 1024 * 100
      ) {
        throw '';
      }
    } catch(err) {
      throw new ResponseError("Încărcați o imagine PNG 270x130 de maximum 100KB.");
    }
    const transaction = await sequelize.transaction();
    try {
      const existingSignature = await SignaturesController.findOneByUserId(userId);
      existingSignature?.destroy({ transaction });
      const signature = await Signature.create({ userId }, { transaction });
      const samplePath = SignaturesController.getStoragePath(`${signature.id}.png`);
      fs.writeFileSync(samplePath, sample);
      await transaction.commit();
      return signature;
    } catch(err) {
      await transaction.rollback();
      throw new ResponseErrorInternal();
    }
  }
  
}