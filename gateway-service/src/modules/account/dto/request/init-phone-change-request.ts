import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, Matches } from 'class-validator'

export class InitPhoneChangeDto {
	@ApiProperty({
		example: '+1234567890',
		description: 'New phone number',
		required: true
	})
	@IsNotEmpty()
	@Matches(/\+?\d{10,15}/)
	public phone: string
}
