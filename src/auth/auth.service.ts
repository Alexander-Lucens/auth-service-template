import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    private configService: ConfigService,
  ) {}

  async signup(dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  async login(dto: LoginDto) {
    const user = await this.userService.getByEmail(dto.email);
    if (!user || !user.password || !(await comparePassword(dto.password, user.password))) {
      throw new ForbiddenException('Incorrect email or password');
    }
    const roles = user.roles || ['user'];
    return this.generateTokens(user.id, dto.email, roles);
  }

  private async generateTokens(userId: string, email: string, roles: string[] = ['user']) {
    const payload = { userId, email, roles };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET_KEY'),
      expiresIn: this.configService.get<string>('TOKEN_EXPIRE_TIME', '1h') as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET_REFRESH_KEY'),
      expiresIn: this.configService.get<string>('TOKEN_REFRESH_EXPIRE_TIME', '24h') as any,
    });
    return { accessToken, refreshToken };
  }

  async refresh(dto: RefreshDto) {
    if (!dto.refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }
    try {
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET_REFRESH_KEY'),
      });
      const user = await this.userService.getByEmail(payload.email);
      if (!user) {
        throw new ForbiddenException('User not found');
      }

      const roles = user.roles || ['user'];
      return this.generateTokens(user.id, user.email, roles);
    } catch (e) {
      throw new ForbiddenException('Invalid refresh token');
    }
  }
}

