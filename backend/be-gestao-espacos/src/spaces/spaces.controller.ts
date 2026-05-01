import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { SpacesService } from './spaces.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

@Controller('spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Roles(UserRole.Admin)
  @Post()
  create(@Body() createSpaceDto: CreateSpaceDto) {
    return this.spacesService.create(createSpaceDto);
  }

  @Roles(UserRole.Admin, UserRole.Monitor, UserRole.Student)
  @Get()
  list() {
    return this.spacesService.list();
  }

  @Roles(UserRole.Admin, UserRole.Monitor, UserRole.Student)
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.spacesService.findById(id);
  }

  @Roles(UserRole.Admin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSpaceDto: UpdateSpaceDto) {
    return this.spacesService.update(id, updateSpaceDto);
  }

  @Roles(UserRole.Admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.spacesService.remove(id);
  }
}
