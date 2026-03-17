import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { comparePassword, hashPassword } from 'src/crypto/hashPassword';
import { IUserRepository } from 'src/db/user/user.repository.interface';
import {
  AuthMethod,
  CreateUserDto,
  CreateUserData,
  UserResponse,
  UpdatePasswordDto,
  User,
} from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(@Inject('USER_REPOSITORY') private repository: IUserRepository) {}

  async getAll() {
    const users: User[] = await this.repository.getAll();
    return plainToInstance(
      UserResponse,
      users.map((user) => this.toSafeUser(user)),
    );
  }

  async getById(id: string) {
    const user: User | undefined = await this.repository.getById(id);
    if (user === undefined) {
      throw new NotFoundException('User not found');
    }
    return plainToInstance(UserResponse, this.toSafeUser(user));
  }

  async getByEmail(email: string): Promise<User | undefined> {
    return this.repository.getByEmail(email);
  }

  async create(data: CreateUserDto) {
    const authMethods = await this.prepareAuthMethods(data);
    const localAuthMethod = authMethods.find((m) => m.provider === 'local');

    const existingUser = await this.repository.getByEmail(data.email);
    if (existingUser) {
      if (localAuthMethod && existingUser.password) {
        throw new BadRequestException(
          'User already exists with password auth. Use /auth/login with email.',
        );
      }
      const linkedUser = await this.repository.linkAuthMethods(
        existingUser.id,
        authMethods,
      );
      if (!linkedUser) {
        throw new NotFoundException('User not found during auth method linking');
      }
      return plainToInstance(UserResponse, this.toSafeUser(linkedUser));
    }

    const createData: CreateUserData = {
      email: data.email,
      password: localAuthMethod?.secret,
      authMethods,
    };

    const user: User = await this.repository.create(createData);
    return plainToInstance(UserResponse, this.toSafeUser(user));
  }

  async update(id: string, data: UpdatePasswordDto) {
    const user: User | undefined = await this.repository.getById(id);
    if (user === undefined) {
      throw new NotFoundException('User not found');
    }
    if (!user.password) {
      throw new ForbiddenException('Password login is not enabled for this user');
    }
    if (!(await comparePassword(data.oldPassword, user.password))) {
      throw new ForbiddenException('Old password is wrong');
    }
    const newPassword: string = await hashPassword(data.newPassword);
    data = { ...data, newPassword: newPassword };
    const uUser: User | undefined = await this.repository.update(id, data);
    if (uUser === undefined) {
      throw new NotFoundException('User not found during update');
    }
    return plainToInstance(UserResponse, this.toSafeUser(uUser));
  }

  async delete(id: string) {
    const user: User | undefined = await this.repository.getById(id);
    if (user === undefined) {
      throw new NotFoundException('User not found');
    }
    const respons = await this.repository.delete(id);
    if (!respons) {
      throw new NotFoundException('User not found');
    }
  }

  private async prepareAuthMethods(data: CreateUserDto): Promise<AuthMethod[]> {
    const normalizedMethods: AuthMethod[] = (data.authMethods || []).map(
      (method) => ({
        provider: method.provider.toLowerCase(),
        providerUserId: method.providerUserId,
        secret: method.secret,
        metadata: method.metadata,
      }),
    );

    const localMethod = normalizedMethods.find((m) => m.provider === 'local');

    if (localMethod?.secret) {
      localMethod.secret = await hashPassword(localMethod.secret);
    } else if (data.password) {
      const passwordHash = await hashPassword(data.password);
      if (localMethod) {
        localMethod.secret = passwordHash;
      } else {
        normalizedMethods.push({
          provider: 'local',
          providerUserId: data.email,
          secret: passwordHash,
        });
      }
    }

    if (normalizedMethods.length === 0) {
      throw new BadRequestException(
        'At least one authentication method is required',
      );
    }

    return normalizedMethods;
  }

  private toSafeUser(user: User): User {
    return {
      ...user,
      authMethods: user.authMethods.map((method) => ({
        provider: method.provider,
        providerUserId: method.providerUserId,
        metadata: method.metadata,
      })),
    };
  }
}
