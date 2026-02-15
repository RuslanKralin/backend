import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class TelegramVerifyRequest {
	@ApiProperty({
		example:
			'eyJpZCI6NTI1MzY2Nzk0LCJmaXJzdF9uYW1lIjoiUnVzbGFuIiwidXNlcm5hbWUiOi...'
	})
	@IsString()
	@IsNotEmpty()
	public tgAuthResult: string
}
