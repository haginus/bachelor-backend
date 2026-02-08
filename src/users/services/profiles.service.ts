import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Profile } from "../entities/profile.entity";
import { Repository } from "typeorm";
import { ProfileDto } from "../dto/profile.dto";
import { UsersService } from "./users.service";
import sharp from "sharp";
import fs from "fs";
import { safePath } from "../../lib/utils";
import { v4 } from "uuid";

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile) private readonly profilesRepository: Repository<Profile>,
    private readonly usersService: UsersService,
  ) {}

  async findOneByUserId(userId: number): Promise<Profile | null> {
    return this.profilesRepository.findOne({ where: { user: { id: userId } } });
  }

  async patch(userId: number, dto: ProfileDto): Promise<Profile> {
    const { picture, ...restDto } = dto;
    const user = await this.usersService.findOne(userId);
    const existingProfile = await this.findOneByUserId(userId) || new Profile();
    const prevPicture = existingProfile.picture;
    let picturePath = existingProfile.picture;
    if(picture) {
      const pictureBuffer = await sharp(picture).resize({ width: 256, height: 256, fit: 'cover' }).jpeg({ quality: 90 }).toBuffer();
      picturePath = `/static/profile/${v4()}.jpeg`;
      fs.writeFileSync(safePath(process.cwd(), picturePath), pictureBuffer);
    }
    const profile = this.profilesRepository.merge(existingProfile, {
      ...restDto,
      picture: picturePath,
      user: user,
    });
    const savedProfile = await this.profilesRepository.save(profile);
    if(prevPicture && picture) {
      try {
        fs.unlinkSync(safePath(process.cwd(), prevPicture));
      } catch(_) {}
    }
    return savedProfile;
  }
}