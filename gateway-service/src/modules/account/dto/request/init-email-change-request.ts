import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty } from 'class-validator'

export class InitEmailChangeDto {
	@ApiProperty({
		example: 'user@example.com',
		description: 'New email address',
		required: true
	})
	@IsNotEmpty()
	@IsEmail()
	public email: string
}
