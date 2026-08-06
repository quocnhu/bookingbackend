import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class RenameFolderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;
}

export class RenameFileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;
}
