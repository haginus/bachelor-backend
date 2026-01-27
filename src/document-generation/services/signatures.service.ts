import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Signature } from "../entities/signature.entity";
import { DataSource, Repository } from "typeorm";
import { User } from "src/users/entities/user.entity";
import { UserType } from "src/lib/enums/user-type.enum";
import { readFile, writeFile } from "fs/promises";
import { safePath } from "src/lib/utils";
import sharp from "sharp";

@Injectable()
export class SignaturesService {

  constructor(
    @InjectRepository(Signature) private readonly signaturesRepository: Repository<Signature>,
    private readonly dataSource: DataSource,
  ) {}

  async findOneByUserId(userId: number, user?: User): Promise<Signature | null> {
    if(user && user.type !== UserType.Admin && userId !== user.id) {
      throw new ForbiddenException();
    }
    return this.signaturesRepository.findOne({ 
      where: {
        userId,
      }
    });
  }

  async findOne(id: number, user?: User): Promise<Signature | null> {
    const signature = await this.signaturesRepository.findOne({ where: { id } });
    if(user && user.type !== UserType.Admin && signature?.userId !== user.id) {
      throw new ForbiddenException();
    }
    return signature;
  }

  async getSignatureSample(id: number, user?: User): Promise<Buffer> {
    const signature = await this.findOne(id, user);
    if(!signature) {
      throw new NotFoundException(`Semnătura nu a fost găsită.`);
    }
    try {
      const buffer = await readFile(this._getStoragePath(`${signature.id}.png`));
      return buffer;
    } catch (err) {
      throw new NotFoundException(`Specimenul semnăturii nu a fost găsit.`);
    }
  }

  async getSignatureSampleBase64URI(id: number, user?: User): Promise<string> {
    const buffer = await this.getSignatureSample(id, user);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  async createOrUpdate(userId: number, sample: Buffer, user?: User): Promise<Signature> {
    if(user && user.type !== UserType.Admin && userId !== user.id) {
      throw new ForbiddenException();
    }
    try {
      const image = sharp(sample);
      const metadata = await image.metadata();
      if(
        metadata.format !== 'png' || 
        metadata.width !== 270 || 
        metadata.height !== 130 || 
        metadata.size! > 1024 * 100
      ) {
        throw '';
      }
    } catch(err) {
      throw new BadRequestException("Încărcați o imagine PNG 270x130 de maximum 100KB.");
    }
    let signature = await this.signaturesRepository.findOne({ where: { userId } });
    if(!signature) {
      signature = this.signaturesRepository.create({ userId });
    }
    return this.dataSource.transaction(async manager => {
      const savedSignature = await manager.save(signature);
      await writeFile(this._getStoragePath(`${savedSignature.id}.png`), sample);
      return savedSignature;
    });
  }

  private _getStoragePath(fileName: string): string {
    return safePath(process.cwd(), 'storage', 'signature-samples', fileName);
  }
}