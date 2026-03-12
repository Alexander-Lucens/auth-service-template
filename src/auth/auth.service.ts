import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { comparePassword } from 'src/crypto/hashPassword';
import { CreateUserDto } from 'src/user/dto/user.dto';
import { UserService } from 'src/user/user.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async signup(dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  async login(dto: LoginDto) {
    const user = await this.userService.getByLogin(dto.login);
    if (!user || !(await comparePassword(dto.password, user.password))) {
      throw new ForbiddenException('Incorrect login or password');
    }
    const roles = user.roles || ['user'];
    return this.generateTokens(user.id, user.login, roles);
  }

  private async generateTokens(userId: string, login: string, roles: string[] = ['user']) {
    const payload = { userId, login, roles };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET_KEY!,
      expiresIn: (process.env.TOKEN_EXPIRE_TIME || '1h') as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET_REFRESH_KEY!,
      expiresIn: (process.env.TOKEN_REFRESH_EXPIRE_TIME || '24h') as any,
    });
    return { accessToken, refreshToken };
  }

  async refresh(dto: RefreshDto) {
    if (!dto.refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }
    try {
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: process.env.JWT_SECRET_REFRESH_KEY,
      });
      const user = await this.userService.getByLogin(payload.login);
      if (!user) {
        throw new ForbiddenException('User not found');
      }

      const roles = user.roles || ['user'];
      return this.generateTokens(user.id, user.login, roles);
    } catch (e) {
      throw new ForbiddenException('Invalid refresh token');
    }
  }
}
