import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { RefreshToken } from "./entities/refresh-token.entity";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class RefreshTokensService {
  constructor(
    @InjectRepository(RefreshToken) private readonly refreshTokensRepository: Repository<RefreshToken>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  /** 30 days */
  private readonly expirationTimeMs = 1000 * 60 * 60 * 24 * 30;

  async create(userId: number, additionalPayload?: RefreshToken['additionalPayload']) {
    const refreshToken = this.refreshTokensRepository.create({
      userId,
      expiresAt: new Date(Date.now() + this.expirationTimeMs),
      additionalPayload: Object.keys(additionalPayload || {}).length > 0 ? additionalPayload : null,
    });
    return this.dataSource.transaction(async manager => {
      await manager.save(refreshToken);
      refreshToken.token = this.generateToken(refreshToken.id, userId, refreshToken.updatedAt);
      return manager.save(refreshToken);
    });
  }

  async findOne(id: number) {
    return this.refreshTokensRepository.findOneBy({ id });
  }

  async findOneByJwt(token: string) {
    const { id, userId, iat } = this.jwtService.verify<{ id: number; userId: number; iat: number; }>(token);
    const tokenEntity = await this.refreshTokensRepository.findOneBy({ id, userId });
    if(!tokenEntity || Math.floor(tokenEntity.updatedAt.getTime() / 1000) !== iat) {
      return null;
    }
    return tokenEntity;
  }

  async rotate(token: string) {
    const refreshToken = await this.findOneByJwt(token);
    if (!refreshToken || !refreshToken.isAvailable()) {
      throw new ForbiddenException();
    }
    refreshToken.updatedAt = new Date();
    refreshToken.token = this.generateToken(refreshToken.id, refreshToken.userId, refreshToken.updatedAt);
    refreshToken.expiresAt = new Date(refreshToken.updatedAt.getTime() + this.expirationTimeMs);
    return this.refreshTokensRepository.save(refreshToken);
  }

  private _revoke(refreshToken: RefreshToken | null) {
    if (!refreshToken || !refreshToken.isAvailable()) {
      throw new ForbiddenException();
    }
    refreshToken.revokedAt = new Date();
    return this.refreshTokensRepository.save(refreshToken);
  }

  async revoke(id: number) {
    const refreshToken = await this.findOne(id);
    return this._revoke(refreshToken);
  }

  async revokeByJwt(token: string) {
    const refreshToken = await this.findOneByJwt(token);
    return this._revoke(refreshToken);
  }

  async removeAllByUserId(userId: number) {
    const refreshTokens = await this.refreshTokensRepository.findBy({ userId });
    await this.refreshTokensRepository.remove(refreshTokens);
  }

  private generateToken(id: number, userId: number, issueDate = new Date()): string {
    return this.jwtService.sign(
      { id, userId, iat: Math.floor(issueDate.getTime() / 1000) },
      { expiresIn: this.expirationTimeMs / 1000 }
    );
  }
}
