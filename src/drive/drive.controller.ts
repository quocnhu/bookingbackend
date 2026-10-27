import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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

// Multer threshold high enough that ADMIN is never blocked; non-ADMIN is blocked at 100MB in the service.
const MAX_FILE_SIZE = 512 * 1024 * 1024; // 512MB buffer

@Controller('drive')
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  @Get()
  root(@CurrentUser() user: AuthenticatedUser) {
    return this.driveService.listContents(user.id);
  }

  @Get('ensure-date')
  ensureDate(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date?: string,
  ) {
    return this.driveService.getOrCreateTourGuideDateFolder(user.id, date);
  }

  @Post('ensure-date')
  ensureDatePost(
    @CurrentUser() user: AuthenticatedUser,
    @Body('date') date?: string,
  ) {
    return this.driveService.getOrCreateTourGuideDateFolder(user.id, date);
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
    @Body('date') date: string,
    @Body('useDateFolder') useDateFolder: string,
    @Body('tourName') tourName: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const useDate =
      useDateFolder === 'true' || useDateFolder === '1' || undefined;
    return this.driveService.uploadFile(
      user.id,
      file,
      folderId || undefined,
      name,
      { date, useDateFolder: !!useDate, tourName: tourName || undefined },
    );
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
