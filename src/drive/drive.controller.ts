import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { RoleType } from '@prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
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

  /** ADMIN may browse/manage another user's Drive; everyone else is self-only. */
  private driveUserId(actor: AuthenticatedUser, requested?: string) {
    if (actor.role === RoleType.ADMIN) return requested || actor.id;
    if (requested && requested !== actor.id) {
      throw new ForbiddenException('You can only access your own Drive');
    }
    return actor.id;
  }

  @Get()
  root(
    @CurrentUser() user: AuthenticatedUser,
    @Query('userId') userId?: string,
  ) {
    return this.driveService.listContents(this.driveUserId(user, userId));
  }

  @Get('users')
  @Roles(RoleType.ADMIN)
  listUsers() {
    return this.driveService.listDriveUsers();
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
  folder(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('userId') userId?: string,
  ) {
    return this.driveService.listContents(this.driveUserId(user, userId), id);
  }

  @Post('folders')
  createFolder(
    @Body() dto: CreateFolderDto,
    @CurrentUser() user: AuthenticatedUser,
    @Query('userId') userId?: string,
  ) {
    return this.driveService.createFolder(this.driveUserId(user, userId), dto);
  }

  @Patch('folders/:id')
  renameFolder(
    @Param('id') id: string,
    @Body() dto: RenameFolderDto,
    @CurrentUser() user: AuthenticatedUser,
    @Query('userId') userId?: string,
  ) {
    return this.driveService.renameFolder(
      this.driveUserId(user, userId),
      id,
      dto,
    );
  }

  @Delete('folders/:id')
  deleteFolder(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('userId') userId?: string,
  ) {
    return this.driveService.deleteFolder(this.driveUserId(user, userId), id);
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
    @Query('userId') userId?: string,
  ) {
    const useDate =
      useDateFolder === 'true' || useDateFolder === '1' || undefined;
    return this.driveService.uploadFile(
      this.driveUserId(user, userId),
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
    @Query('userId') userId?: string,
  ) {
    return this.driveService.renameFile(
      this.driveUserId(user, userId),
      id,
      dto,
    );
  }

  @Delete('files/:id')
  deleteFile(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('userId') userId?: string,
  ) {
    return this.driveService.deleteFile(this.driveUserId(user, userId), id);
  }
}
