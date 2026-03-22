import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import crypto from 'crypto';
import { InValidSignatureException } from '../exceptions/exceptions';

@Injectable()
export class GithubWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const signature = request.headers['x-hub-signature-256'];
    const rawBody = request.body;

    const expectedSignature =
      'sha256=' +
      crypto
        .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

    const valid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );

    if (!valid) {
      throw new InValidSignatureException();
    }

    return true;
  }
}
