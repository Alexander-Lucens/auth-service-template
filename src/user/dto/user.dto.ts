import { Exclude } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export interface AuthMethod {
  provider: string;
  providerUserId: string;
  secret?: string;
  metadata?: Record<string, unknown>;
}

export interface User {
  id: string;
  email: string;
  password?: string;
  roles: string[];
  version: number;
  createdAt: number;
  updatedAt: number;
  authMethods: AuthMethod[];
}

export interface CreateUserData {
  email: string;
  password?: string;
  authMethods: AuthMethod[];
}

export class CreateAuthMethodDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  provider: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  providerUserId: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  secret?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateUserDto {
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(64)
  password?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAuthMethodDto)
  authMethods?: CreateAuthMethodDto[];
}

export class UpdatePasswordDto {
  @IsNotEmpty()
  @IsString()
  oldPassword: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @MaxLength(64)
  newPassword: string;
}

export class UserResponse {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  roles: string[];

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  version: number;

  @IsNotEmpty()
  createdAt: number;

  @IsNotEmpty()
  updatedAt: number;

  @Exclude()
  password?: string;

  @IsArray()
  authMethods: Omit<AuthMethod, 'secret'>[];
}
