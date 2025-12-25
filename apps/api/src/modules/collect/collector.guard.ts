import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { RuntimeConfigService } from '../../config/runtime-config.service';

@Injectable()
export class CollectorGuard implements CanActivate {
  constructor(private readonly cfg: RuntimeConfigService) {}

  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request & { headers?: any }>();
    const expected = String(this.cfg.require().security.collectorWorkerToken || '').trim();
    if (!expected) throw new UnauthorizedException();

    const header = String((req.headers as any)?.authorization || '');
    const bearer = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
    const xToken = String((req.headers as any)?.['x-collector-token'] || '').trim();
    const token = bearer || xToken;

    if (token !== expected) throw new UnauthorizedException();
    return true;
  }
}
