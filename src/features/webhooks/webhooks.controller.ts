import {
  Body,
  Controller,
  Headers,
  HttpStatus,
  Logger,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { GithubWebhookGuard } from 'src/features/webhooks/guards/github-webhook.guard';
import { WebHooksHandler } from './webhooks.service';
import { Response } from 'express';
import { Public } from 'src/infrastructure/decorators/public.decorator';

@Controller({ path: 'webhooks/github', version: '1' })
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly handler: WebHooksHandler) {}

  @Post()
  @Public()
  @UseGuards(GithubWebhookGuard)
  public async handle(
    @Headers('x-github-event') eventType: string,
    @Headers('x-github-delivery') deliveryId: string,
    @Body() payload: any,
    @Res() res: Response,
  ) {
    res
      .status(HttpStatus.OK)
      .json({ message: 'Webhook events handled successfully' });
    this.logger.log({ eventType, deliveryId }, 'Received GitHub webhook');

    this.handler.handle(eventType, deliveryId, payload);
  }
}
