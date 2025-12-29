import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SessionTokenService } from './session-token.service';
import { SessionTokenGuard } from './session-token.guard';
import type { Request } from 'express';

@ApiTags('public/auth')
@Controller('api/v1/auth')
export class SessionTokenController {
  constructor(private readonly svc: SessionTokenService) {}

  @Post('session-token')
  @ApiOperation({ summary: '获取会话token' })
  @ApiBody({ schema: { properties: { apiKey: { type: 'string', description: 'API密钥' } } } })
  @ApiResponse({ status: 200, description: '返回会话token' })
  async getSessionToken(@Body() body: { apiKey?: string }, @Req() req: Request) {
    const ip = this.getClientIp(req);
    const userAgent = req.get('user-agent') || '';


    try {
      // 验证 API Key
      if (!body.apiKey) {
        return {
          ok: false,
          message: 'API Key is required',
        };
      }

      const isValidKey = await this.svc.verifyApiKey(body.apiKey, ip);

      if (!isValidKey) {
        return {
          ok: false,
          message: 'Invalid API Key',
        };
      }

      // 获取 API Key 的 ID
      const apiKeyRecord = await this.svc.getApiKeyRecord(body.apiKey);
      if (!apiKeyRecord) {
        return {
          ok: false,
          message: 'API Key not found',
        };
      }

      const token = await this.svc.generateToken(apiKeyRecord.id);
      return {
        ok: true,
        data: { token },
      };
    } catch (error) {
      console.error('[SessionToken] Error:', error);
      return {
        ok: false,
        message: 'Failed to generate token',
      };
    }
  }

  @Post('session-token/bind')
  @UseGuards(SessionTokenGuard)
  @ApiOperation({ summary: '绑定会话token到客户端' })
  @ApiResponse({ status: 200, description: '绑定成功' })
  async bindSessionToken(@Req() req: Request) {
    const token = req.headers['x-session-token'] as string;
    const ip = this.getClientIp(req);
    const userAgent = req.get('user-agent') || '';

    await this.svc.bindTokenToClient(token, ip, userAgent);

    return {
      ok: true,
      data: null,
    };
  }

  private getClientIp(req: Request): string {
    const xff = req.headers['x-forwarded-for'];
    let ip = '';
    if (typeof xff === 'string') ip = xff.split(',')[0].trim();
    else if (Array.isArray(xff)) ip = xff[0];
    else ip = req.ip || req.socket?.remoteAddress || '';

    // 处理 IPv6 映射的 IPv4 地址 (::ffff:192.168.1.99 -> 192.168.1.99)
    if (ip.startsWith('::ffff:')) {
      ip = ip.slice(7);
    }

    return ip;
  }
}
