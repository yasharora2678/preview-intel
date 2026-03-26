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

@Controller({ path: 'webhooks/github', version: '1' })
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly handler: WebHooksHandler) {}

  @Post()
  @UseGuards(GithubWebhookGuard)
  public async handle(
    @Headers('x-github-event') eventType: string,
    @Headers('x-github-delivery') deliveryId: string,
    @Body() payload: any,
    @Res() res: Response,
  ) {
    this.logger.log({ eventType, deliveryId }, 'Received GitHub webhook');

    await this.handler.handle(eventType, deliveryId, payload);
    return res
      .status(HttpStatus.OK)
      .json({ message: 'Webhook events handeled successfully' });
  }
}
