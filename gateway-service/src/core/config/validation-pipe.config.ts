import { ValidationPipeOptions } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export function getValidationPipeConfig(
	options?: ValidationPipeOptions
): ValidationPipeOptions {
	return {
		transform: true,
		whitelist: true,
		...options
	}
}
