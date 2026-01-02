import { ConfigService } from '@nestjs/config'
import { CorsOptions } from 'cors'

export function getCorsConfig(configService: ConfigService): CorsOptions {
	return {
		origin: configService.getOrThrow<string>('HTTP_CORS').split(','),
		credentials: true
	}
}
