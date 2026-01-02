import { Injectable } from '@nestjs/common'

import { HealthResponse } from './dto'

@Injectable()
export class AppService {
	getHello(): string {
		return 'Welcome to Gateway Service!'
	}

	healthCheck(): HealthResponse {
		return {
			status: 'OK',
			timestamp: new Date().toISOString()
		}
	}
}
