import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebhookService } from './webhook.service';

@Module({
  imports: [HttpModule.register({ timeout: 5000 })],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
