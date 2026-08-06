import { Body, Controller, Headers, Post } from '@nestjs/common';
import { Public } from '@/common/decorators/public.decorator';
import { GmailService } from './gmail.service';

@Controller('gmail')
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Public()
  @Post('webhook')
  async webhook(@Headers('authorization') authorization: string | undefined, @Body() body: any) {
    return this.gmailService.handleWebhook(authorization, body);
  }
}
