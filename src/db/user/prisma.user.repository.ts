import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IUserRepository } from './user.repository.interface';
import {
  CreateUserData,
  User as DomainUser,
  UpdatePasswordDto,
} from 'src/user/dto/user.dto';
import {
  Prisma,
  User as PrismaUser,
  AuthMethod as PrismaAuthMethod,
} from '@prisma/client';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async getAll(): Promise<DomainUser[]> {
    const users = await this.prisma.user.findMany({
      include: { authMethods: true },
    });
    return users.map((user) => this.mapToDomain(user));
  }

  async getById(id: string): Promise<DomainUser | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { authMethods: true },
    });
    return user ? this.mapToDomain(user) : undefined;
  }

  async getByEmail(email: string): Promise<DomainUser | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { authMethods: true },
    });
    return user ? this.mapToDomain(user) : undefined;
  }

  async create(dto: CreateUserData): Promise<DomainUser> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: dto.password,
          roles: ['user'], // Default role
          version: 1,
          authMethods: {
            create: dto.authMethods.map((method) => ({
              provider: method.provider,
              providerUserId: method.providerUserId,
              secret: method.secret,
              metadata:
                (method.metadata as Prisma.InputJsonValue | undefined) ??
                undefined,
            })),
          },
        },
        include: { authMethods: true },
      });
      return this.mapToDomain(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('User with this email already exists');
      }
      throw error;
    }
  }

  async linkAuthMethods(
    id: string,
    methods: CreateUserData['authMethods'],
  ): Promise<DomainUser | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { authMethods: true },
    });

    if (!user) {
      return undefined;
    }

    const existingKeys = new Set(
      user.authMethods.map((method) =>
        `${method.provider}:${method.providerUserId}`.toLowerCase(),
      ),
    );

    const methodsToCreate = methods.filter(
      (method) =>
        !existingKeys.has(
          `${method.provider}:${method.providerUserId}`.toLowerCase(),
        ),
    );

    if (methodsToCreate.length === 0) {
      return this.mapToDomain(user);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        authMethods: {
          create: methodsToCreate.map((method) => ({
            provider: method.provider,
            providerUserId: method.providerUserId,
            secret: method.secret,
            metadata:
              (method.metadata as Prisma.InputJsonValue | undefined) ??
              undefined,
          })),
        },
      },
      include: { authMethods: true },
    });

    return this.mapToDomain(updatedUser);
  }

  async update(
    id: string,
    data: UpdatePasswordDto,
  ): Promise<DomainUser | undefined> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          password: data.newPassword,
          version: { increment: 1 },
        },
        include: { authMethods: true },
      });
      return this.mapToDomain(user);
    } catch {
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.user.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  private mapToDomain(
    user: PrismaUser & { authMethods?: PrismaAuthMethod[] },
  ): DomainUser {
    return {
      id: user.id,
      email: user.email || '',
      password: user.password || undefined,
      roles: user.roles || ['user'],
      version: user.version,
      createdAt: user.createdAt.getTime(),
      updatedAt: user.updatedAt.getTime(),
      authMethods: (user.authMethods || []).map((method) => ({
        provider: method.provider,
        providerUserId: method.providerUserId,
        secret: method.secret || undefined,
        metadata:
          method.metadata && typeof method.metadata === 'object'
            ? (method.metadata as Record<string, unknown>)
            : undefined,
      })),
    };
  }
}
