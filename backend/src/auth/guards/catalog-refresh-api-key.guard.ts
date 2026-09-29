import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { matchesCatalogRefreshApiKey } from '../catalog-refresh-api-key';

export const CATALOG_REFRESH_API_KEY_CONFIG = 'CATALOG_REFRESH_API_KEY_CONFIG';

type RequestWithApiKeyHeader = {
  headers?: Record<string, string | readonly string[] | undefined>;
};

@Injectable()
export class CatalogRefreshApiKeyGuard implements CanActivate {
  constructor(
    @Inject(CATALOG_REFRESH_API_KEY_CONFIG)
    private readonly expectedApiKey: string,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithApiKeyHeader>();
    const receivedApiKey = request.headers?.['x-api-key'];

    if (!matchesCatalogRefreshApiKey(receivedApiKey, this.expectedApiKey)) {
      throw new UnauthorizedException('Autenticación requerida o credenciales inválidas.');
    }

    return true;
  }
}
