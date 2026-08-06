import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { DriveService } from './drive.service';
import {
  CreateFolderDto,
  RenameFileDto,
  RenameFolderDto,
} from './dto/drive.dto';

// Ngưỡng multer đủ cao để ADMIN không bị chặn; non-ADMIN bị chặn 100MB ở service.
const MAX_FILE_SIZE = 512 * 1024 * 1024; // 512MB buffer

@Controller('drive')
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  @Get()
  root(@CurrentUser() user: AuthenticatedUser) {
    return this.driveService.listContents(user.id);
  }

  @Get('folders/:id')
  folder(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.driveService.listContents(user.id, id);
  }

  @Post('folders')
  createFolder(
    @Body() dto: CreateFolderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.driveService.createFolder(user.id, dto);
  }

  @Patch('folders/:id')
  renameFolder(
    @Param('id') id: string,
    @Body() dto: RenameFolderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.driveService.renameFolder(user.id, id, dto);
  }

  @Delete('folders/:id')
  deleteFolder(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.driveService.deleteFolder(user.id, id);
  }

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Body('userId') targetUserId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.driveService.uploadAvatar(user, file, targetUserId);
  }

  @Post('files')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('folderId') folderId: string,
    @Body('name') name: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.driveService.uploadFile(user.id, file, folderId, name);
  }

  @Patch('files/:id')
  renameFile(
    @Param('id') id: string,
    @Body() dto: RenameFileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.driveService.renameFile(user.id, id, dto);
  }

  @Delete('files/:id')
  deleteFile(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.driveService.deleteFile(user.id, id);
  }
}
