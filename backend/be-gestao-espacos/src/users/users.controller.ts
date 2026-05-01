import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(UserRole.Admin)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Roles(UserRole.Admin, UserRole.Monitor)
  @Get()
  list(@Query('role') role?: UserRole, @Query('search') search?: string) {
    return this.usersService.list(role, search);
  }

  @Roles(UserRole.Admin, UserRole.Monitor)
  @Get('students')
  listStudents() {
    return this.usersService.list(UserRole.Student);
  }

  @Roles(UserRole.Admin, UserRole.Monitor, UserRole.Student)
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Roles(UserRole.Admin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Roles(UserRole.Admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
