import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

import {
  CreateUserDto,
  UpdatePasswordDto,
} from './dto/user.dto';

import { UserService } from './user.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Roles('admin')
  getAllUsers() {
    return this.userService.getAll();
  }

  @Get(':id')
  @Roles('admin', 'user')
  getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.getById(id);
  }

  @Post()
  @Public()
  createUser(@Body() body: CreateUserDto) {
    return this.userService.create(body);
  }

  @Put(':id/password')
  @Roles('admin', 'user')
  updatePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePasswordDto,
    @Req() req: Request & { user?: { userId: string; roles?: string[] } },
  ) {
    const roles = req.user?.roles ?? [];
    const currentUserId = req.user?.userId;

    const isAdmin = roles.includes('admin');
    const isSelf = currentUserId === id;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException('You can only update your own password');
    }

    return this.userService.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(204)
  deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.delete(id);
  }
}
