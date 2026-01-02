import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger'

import { AppService } from './app.service'
import { HealthResponse } from './dto'

@Controller()
export class AppController {
	public constructor(private readonly appService: AppService) {}

	@ApiOperation({
		summary: 'Get Hello',
		description: 'Returns a simple welcome message'
	})
	@Get()
	public getHello(): string {
		return this.appService.getHello()
	}

	@ApiOperation({
		summary: 'Health Check',
		description: 'Checks if the service is running'
	})
	@ApiOkResponse({
		type: HealthResponse,
		description: 'Service is running'
	})
	@Get('health')
	public healthCheck(): HealthResponse {
		return this.appService.healthCheck()
	}
}
