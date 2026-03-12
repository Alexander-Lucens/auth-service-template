import { Exclude } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export interface User {
  id: string;
  login: string;
  password: string;
  roles: string[];
  version: number;
  createdAt: number;
  updatedAt: number;
}

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  login: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}

export class UpdatePasswordDto {
  @IsNotEmpty()
  @IsString()
  oldPassword: string;

  @IsNotEmpty()
  @IsString()
  newPassword: string;
}

export class UserResponse {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsNotEmpty()
  @IsString()
  login: string;

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
  password: string;
}
