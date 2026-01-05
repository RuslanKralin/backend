import { ApiProperty } from '@nestjs/swagger'
import {
	IsEnum,
	IsNotEmpty,
	IsNumberString,
	IsString,
	Length,
	Validate
} from 'class-validator'
import { IdentifierValidator } from 'src/shared/validators'

export class VerifyOtpRequest {
	@ApiProperty({
		example: '+1234567890',
		description: 'User identifier (phone or email)',
		required: true
	})
	@IsString()
	@Validate(IdentifierValidator)
	public identifier: string

	@ApiProperty({
		example: '123456',
		description: 'OTP code to verify'
	})
	@IsNotEmpty()
	@IsNumberString()
	@Length(6, 6)
	public code: string

	@ApiProperty({
		example: 'phone',
		description: 'Type of identifier (phone or email)',
		enum: ['phone', 'email']
	})
	@IsEnum(['phone', 'email'])
	public type: 'phone' | 'email'
}
