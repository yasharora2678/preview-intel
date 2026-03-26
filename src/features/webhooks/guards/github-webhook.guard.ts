import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  InValidRawBodyException,
  InValidSignatureException,
} from '../../../infrastructure/http/exceptions/exceptions';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubWebhookGuard implements CanActivate {
  private readonly logger = new Logger(GithubWebhookGuard.name);
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const signature = request.headers['x-hub-signature-256'];
    const deliveryId = request.headers['x-github-delivery'] as string;

    if (!signature) {
      this.logger.warn({ deliveryId }, 'Missing X-Hub-Signature-256 header');
      throw new InValidSignatureException();
    }

    const rawBody: Buffer = request.rawBody;

    if (!rawBody) {
      throw new InValidRawBodyException();
    }

    const secret = this.config.get<string>('GITHUB_WEBHOOK_SECRET');
    const expectedSignature =
      'sha256=' +
      crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const valid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );

    if (!valid) {
      this.logger.warn({ deliveryId }, 'Invalid webhook signature');
      throw new InValidSignatureException();
    }

    return true;
  }
}
