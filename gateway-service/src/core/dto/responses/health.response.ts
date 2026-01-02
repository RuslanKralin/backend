import { ApiProperty } from '@nestjs/swagger'

export class HealthResponse {
	@ApiProperty({
		example: 'OK'
	})
	public status: string

	@ApiProperty({
		example: '2026-01-02T20:22:19.123Z'
	})
	public timestamp: string
}
