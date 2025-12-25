import { IsString, IsEmail, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'Username (3-20 characters)', example: 'john_doe' })
  @IsString()
  @MinLength(3, { message: '用户名至少3个字符' })
  @MaxLength(20, { message: '用户名最多20个字符' })
  username!: string;

  @ApiProperty({ description: 'Password (6+ characters)', example: 'SecurePass123' })
  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  password!: string;

  @ApiProperty({ description: 'Email address', example: 'user@example.com', required: false })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @ApiProperty({ description: 'Display nickname', example: 'John', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '昵称最多50个字符' })
  nickname?: string;

  @ApiProperty({ description: 'CAPTCHA code', required: false })
  @IsOptional()
  @IsString()
  verify?: string;

  @ApiProperty({ description: 'CAPTCHA key', required: false })
  @IsOptional()
  @IsString()
  verifyKey?: string;
}

export class LoginDto {
  @ApiProperty({ description: 'Username', example: 'john_doe' })
  @IsString()
  @MinLength(3, { message: '用户名至少3个字符' })
  username!: string;

  @ApiProperty({ description: 'Password', example: 'SecurePass123' })
  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  password!: string;

  @ApiProperty({ description: 'CAPTCHA code', required: false })
  @IsOptional()
  @IsString()
  verify?: string;

  @ApiProperty({ description: 'CAPTCHA key', required: false })
  @IsOptional()
  @IsString()
  verifyKey?: string;
}

export class UpdateProfileDto {
  @ApiProperty({ description: 'Display nickname', example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '昵称最多50个字符' })
  nickname?: string;

  @ApiProperty({ description: 'Email address', example: 'user@example.com', required: false })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @ApiProperty({ description: 'Avatar URL', example: 'https://example.com/avatar.jpg', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: '头像URL最多255个字符' })
  avatar?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password', example: 'OldPass123' })
  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  oldPassword!: string;

  @ApiProperty({ description: 'New password', example: 'NewPass456' })
  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  newPassword!: string;
}

export class AddFavoriteDto {
  @ApiProperty({ description: 'Video ID', example: 123 })
  @IsString()
  rid!: string;
}

export class DeleteFavoritesDto {
  @ApiProperty({ description: 'Array of video IDs to delete', example: [123, 124, 125] })
  @IsString({ each: true })
  rids!: string[];
}

export class RecordPlayDto {
  @ApiProperty({ description: 'Video ID', example: 123 })
  @IsString()
  rid!: string;

  @ApiProperty({ description: 'Episode index (0-based)', example: 0 })
  @IsString()
  episode!: string;

  @ApiProperty({ description: 'Play time in seconds', example: 3600 })
  @IsString()
  playTime!: string;
}

export class DeletePlayHistoryDto {
  @ApiProperty({ description: 'Array of history IDs to delete', example: [1, 2, 3] })
  @IsString({ each: true })
  ids!: string[];
}

export class PaginationDto {
  @ApiProperty({ description: 'Page number (1-based)', example: 1, required: false })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiProperty({ description: 'Items per page', example: 20, required: false })
  @IsOptional()
  @IsString()
  limit?: string;
}
