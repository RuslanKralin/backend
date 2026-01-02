import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsString, Validate } from 'class-validator'
import { IdentifierValidator } from 'src/shared/validators'

export class SendOtpRequest {
	@ApiProperty({
		example: '+1234567890',
		description: 'User identifier (phone or email)',
		required: true
	})
	@IsString()
	@Validate(IdentifierValidator)
	public identifier: string

	@ApiProperty({
		example: 'phone',
		description: 'Type of identifier (phone or email)',
		enum: ['phone', 'email'],
		required: true
	})
	@IsEnum(['phone', 'email'])
	public type: 'phone' | 'email'
}
