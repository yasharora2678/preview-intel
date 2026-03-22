import { Body, Controller, Headers, HttpStatus, Post, Res, UseGuards } from "@nestjs/common";
import { GithubWebhookGuard } from "src/infrastructure/http/guards/GithubWebhookGuard";
import { WebHooksHandler } from "./webhooks.service";
import { Response } from "express";

@Controller({path: 'webhooks/github', version: '1'})
export class WebhooksController {
  constructor(private readonly handler: WebHooksHandler) {}

  @Post()
  @UseGuards(GithubWebhookGuard)
  public async handle(
    @Headers('x-github-event') event: string,
    @Body() payload: any,
    @Res() res: Response
  ) {
    console.log("hi")
    payload = JSON.parse(payload.toString());
    await this.handler.handle(event, payload);
    return res
      .status(HttpStatus.OK)
      .json({ message: 'Webhook events handeled successfully' });
  }
}