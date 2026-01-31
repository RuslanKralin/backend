import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumberString, Length, Matches } from 'class-validator'

export class ConfirmPhoneChangeDto {
	@ApiProperty({
		example: '+1234567890',
		description: 'New phone number',
		required: true
	})
	@IsNotEmpty()
	@Matches(/\+?\d{10,15}/)
	public phone: string

	@ApiProperty({
		example: '123456',
		description: 'New phone number',
		required: true
	})
	@IsNotEmpty()
	@IsNumberString()
	@Length(6, 6)
	public code: string
}
