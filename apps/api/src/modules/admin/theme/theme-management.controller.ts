import { Controller, Get, Post, Param, Body, UseGuards, UploadedFile, UseInterceptors, BadRequestException, Header, Query, UnauthorizedException, SetMetadata } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../auth/admin.guard';
import { ThemeManagementService } from './theme-management.service';
import { JwtService } from '@nestjs/jwt';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Controller('admin/theme')
@UseGuards(AdminGuard)
export class ThemeManagementController {
  constructor(
    private readonly themeService: ThemeManagementService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  async list() {
    return this.themeService.listThemes();
  }

  @Get(':themeId')
  async detail(@Param('themeId') themeId: string) {
    return this.themeService.getTheme(themeId);
  }

  @Post()
  async install(@Body() input: {
    themeId: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
    homepage?: string;
    repository?: string;
    configSchema: Record<string, any>;
  }) {
    return this.themeService.installTheme(input);
  }

  @Post(':themeId/config')
  async updateConfig(
    @Param('themeId') themeId: string,
    @Body() input: { config: Record<string, any> },
  ) {
    return this.themeService.updateThemeConfig(themeId, input.config);
  }

  @Get(':themeId/config/file')
  async getConfigFile(@Param('themeId') themeId: string) {
    return this.themeService.getThemeConfigFromFile(themeId);
  }

  @Public()
  @Get(':themeId/config-page')
  @Header('Content-Type', 'text/html')
  async getConfigPage(
    @Param('themeId') themeId: string,
    @Query('token') token: string,
  ) {
    // Verify token from query parameter for iframe access
    if (!token) {
      throw new UnauthorizedException('Token required');
    }

    try {
      await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    return this.themeService.getThemeConfigPage(themeId);
  }

  @Post(':themeId/config/file')
  async saveConfigFile(
    @Param('themeId') themeId: string,
    @Body() input: { config: Record<string, any> },
  ) {
    return this.themeService.saveThemeConfigToFile(themeId, input.config);
  }

  @Post(':themeId/activate')
  async activate(@Param('themeId') themeId: string) {
    return this.themeService.activateTheme(themeId);
  }

  @Post(':themeId/delete')
  async delete(@Param('themeId') themeId: string) {
    return this.themeService.deleteTheme(themeId);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!file.originalname.endsWith('.zip')) {
      throw new BadRequestException('Only ZIP files are supported');
    }

    return this.themeService.installThemePackage(file);
  }

  @Post(':themeId/upload-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('themeId') themeId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only image files are supported');
    }

    return this.themeService.uploadThemeImage(themeId, file);
  }
}
