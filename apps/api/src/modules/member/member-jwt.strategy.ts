import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RuntimeConfigService } from '../../config/runtime-config.service';

export type MemberJwtPayload = {
  sub: number;
  username: string;
  groupId: number;
  scope: 'member';
};

@Injectable()
export class MemberJwtStrategy extends PassportStrategy(Strategy, 'member-jwt') {
  constructor(cfg: RuntimeConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.require().security.memberJwtSecret,
    });
  }

  async validate(payload: MemberJwtPayload) {
    return payload;
  }
}
