import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class TelegramFinalizeRequest {
	@ApiProperty({
		example: '258ab42bd9d024836f3606f02452a146'
	})
	@IsString()
	@IsNotEmpty()
	public sessionId: string
}
