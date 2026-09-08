import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable, isObservable } from 'rxjs';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const activation = super.canActivate(context);
    if (activation instanceof Promise) {
      return activation.catch(() => true);
    }
    if (isObservable(activation)) {
      return firstValueFrom(activation).catch(() => true);
    }
    return activation;
  }

  handleRequest<TUser = any>(err: any, user: any): TUser {
    if (err || !user) {
      return null as TUser;
    }
    return user;
  }
}
