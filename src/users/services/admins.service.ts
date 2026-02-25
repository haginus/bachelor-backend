import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Admin, Secretary, User } from "../entities/user.entity";
import { In, Repository, DataSource } from "typeorm";
import { UsersService } from "./users.service";
import { LoggerService } from "../../common/services/logger.service";
import { LogName } from "../../lib/enums/log-name.enum";
import { AdminDto } from "../dto/admin.dto";
import { AdminQueryDto } from "../dto/admin-query.dto";

@Injectable()
export class AdminsService {
  
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
    private readonly loggerService: LoggerService,
  ) {}

  async findAll(query: AdminQueryDto = {}): Promise<User[]> {
    const type = query.type ? query.type : In(['admin', 'secretary']);
    return this.usersRepository.findBy({ type });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if(!user || (user.type !== 'admin' && user.type !== 'secretary')) {
      throw new NotFoundException('Utilizatorul nu a fost găsit.');
    }
    return user;
  }

  async findOneAdmin(id: number): Promise<Admin> {
    const user = await this.usersRepository.findOneBy({ id });
    if(!user || user.type !== 'admin') {
      throw new NotFoundException('Administratorul nu a fost găsit.');
    }
    return user as Admin;
  }

  async findOneSecretary(id: number): Promise<Secretary> {
    const user = await this.usersRepository.findOneBy({ id });
    if(!user || user.type !== 'secretary') {
      throw new NotFoundException('Secretarul nu a fost găsit.');
    }
    return user as Secretary;
  }

  async create(dto: AdminDto, requestUser?: User): Promise<User> {
    await this.usersService.checkEmailExists(dto.email);
    const user = this.usersRepository.create(dto);
    user.validated = true;
    return this.dataSource.transaction(async manager => {
      const result = await manager.save(user);
      await this.loggerService.log({ name: LogName.UserCreated, userId: result.id, meta: { payload: dto } }, { user: requestUser, manager });
      await this.usersService.sendActivationEmail(result, manager);
      return result;
    });
  }

  async update(id: number, dto: AdminDto, requestUser?: User): Promise<User> {
    await this.usersService.checkEmailExists(dto.email, id);
    const user = await this.findOne(id);
    const updatedUser = this.usersRepository.merge(user, dto);
    return this.dataSource.transaction(async manager => {
      const result = await manager.save(updatedUser);
      // This is needed as TypeORM does not update the type field
      await manager.update(User, id, { type: updatedUser.type });
      await this.loggerService.log({ name: LogName.UserUpdated, userId: result.id, meta: { payload: dto } }, { user: requestUser, manager });
      return result;
    });
  }

  async remove(id: number, requestUser?: User): Promise<void> {
    const user = await this.findOne(id);
    await this.dataSource.transaction(async manager => {
      await manager.softRemove(user);
      await this.loggerService.log({ name: LogName.UserDeleted, userId: user.id }, { user: requestUser, manager });
    });
  }

}