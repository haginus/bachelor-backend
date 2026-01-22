import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../entities/user.entity";
import { FindOptionsRelations, Repository } from "typeorm";

@Injectable()
export class UsersService {
  
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  private defaultRelations: FindOptionsRelations<User> = {
    profile: true,
    specialization: { domain: true },
  };

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ 
      where: { id },
      relations: this.defaultRelations,
    });
    if(!user) {
      throw new NotFoundException();
    }
    return user;
  }

  async findOneByEmailNullable(email: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({ 
      where: { email },
      relations: this.defaultRelations
    });
    return user;
  }
}