import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsNumberString, Length } from 'class-validator'

export class ConfirmEmailChangeDto {
	@ApiProperty({
		example: 'user@example.com',
		description: 'New email address',
		required: true
	})
	@IsNotEmpty()
	@IsEmail()
	public email: string

	@ApiProperty({
		example: '123456',
		description: 'New email address',
		required: true
	})
	@IsNotEmpty()
	@IsNumberString()
	@Length(6, 6)
	public code: string
}
