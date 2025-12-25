import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { MemberAuthService } from './member-auth.service';
import { RegisterDto, LoginDto } from './dtos/member.dto';

@ApiTags('public')
@Controller('api/v1/user')
export class MemberAuthController {
  constructor(private readonly auth: MemberAuthService) {}

  @Post('register')
  @ApiResponse({ status: 200, description: 'User registered successfully', schema: { example: { token: 'jwt_token_here' } } })
  @ApiResponse({ status: 400, description: 'Validation error or user already exists' })
  async register(@Body(ValidationPipe) body: RegisterDto) {
    return this.auth.register(body);
  }

  @Post('login')
  @ApiResponse({ status: 200, description: 'User logged in successfully', schema: { example: { token: 'jwt_token_here' } } })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body(ValidationPipe) body: LoginDto) {
    return this.auth.login(body.username, body.password, body.verify, body.verifyKey);
  }

  @Post('logout')
  @ApiResponse({ status: 200, description: 'User logged out successfully' })
  async logout() {
    return { ok: true };
  }
}
