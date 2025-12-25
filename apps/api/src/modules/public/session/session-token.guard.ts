import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SessionTokenService } from './session-token.service';
import type { Request } from 'express';

@Injectable()
export class SessionTokenGuard implements CanActivate {
  constructor(private readonly sessionTokenService: SessionTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 检查会话 Token 功能是否启用
    try {
      const config = await this.sessionTokenService.getConfig();
      if (!config || !config.enabled) {
        return true; // 功能关闭，允许所有请求
      }
    } catch {
      // 如果查询配置失败（表不存在等），允许请求
      return true;
    }

    // 获取 Token
    const token = request.headers['x-session-token'] as string | undefined;

    if (!token) {
      throw new UnauthorizedException('Session token is required');
    }

    // 验证 Token
    const isValid = await this.sessionTokenService.verifyToken(token);

    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired session token');
    }

    return true;
  }
}

