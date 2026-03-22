import { Injectable, NestMiddleware } from '@nestjs/common';
import * as express from 'express';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class GithubRawBodyMiddleware implements NestMiddleware {
  private rawParser = express.raw({ type: 'application/json' });

  use(req: Request, res: Response, next: NextFunction) {
    this.rawParser(req, res, next);
    return next();
  }
}