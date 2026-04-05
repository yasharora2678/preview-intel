import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common';
import { User } from 'src/domain/user.entity';

@Injectable()
export class IsAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    // I20: was using user?.isAdmin (camelCase) — entity property is is_admin (snake_case)
    if (!user?.is_admin) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}