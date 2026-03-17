import {
  User,
  CreateUserData,
  UpdatePasswordDto,
} from 'src/user/dto/user.dto';

export interface IUserRepository {
  getAll(): Promise<User[]>;
  getById(id: string): Promise<User | undefined>;
  getByEmail(email: string): Promise<User | undefined>;
  create(data: CreateUserData): Promise<User>;
  linkAuthMethods(
    id: string,
    methods: CreateUserData['authMethods'],
  ): Promise<User | undefined>;
  update(id: string, data: UpdatePasswordDto): Promise<User | undefined>;
  delete(id: string): Promise<boolean>;
}
