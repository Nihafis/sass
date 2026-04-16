import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          const res = context.switchToHttp().getResponse();
          // ✅ log ทุก request: method, path, status, latency
          this.logger.log(`${method} ${url} ${res.statusCode} +${ms}ms`);
        },
        error: (err) => {
          const ms = Date.now() - start;
          // ✅ error log เมื่อ request fail
          this.logger.error(`${method} ${url} ERROR +${ms}ms — ${err.message}`);
        },
      }),
    );
  }
}