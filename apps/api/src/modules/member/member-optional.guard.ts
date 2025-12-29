import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * 可选的会员认证守卫
 * 如果有有效的JWT则解析用户信息，否则继续（不抛出错误）
 */
@Injectable()
export class MemberOptionalGuard extends AuthGuard('member-jwt') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest(err: any, user: any) {
    // 不抛出错误，只返回用户（可能为null）
    return user || null;
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
