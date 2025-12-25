import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MemberGuard } from './member.guard';

@ApiTags('public')
@ApiBearerAuth()
@UseGuards(MemberGuard)
@Controller('api/v1/me')
export class MemberMeController {
  @Get()
  me(@Req() req: any) {
    return req.user;
  }
}

