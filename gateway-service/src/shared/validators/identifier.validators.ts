import {
	ValidationArguments,
	ValidatorConstraint,
	ValidatorConstraintInterface
} from 'class-validator'
import { SendOtpRequest } from 'src/modules/auth/dto'

@ValidatorConstraint({ name: 'identifierValidator', async: false })
export class IdentifierValidator implements ValidatorConstraintInterface {
	public validate(value: string, args: ValidationArguments): boolean {
		const object = args.object as SendOtpRequest

		if (object.type === 'phone') {
			// Валидация телефона: 12 цифр, начинается с + (международный формат)
			return (
				typeof value === 'string' &&
				value.length === 12 &&
				value.startsWith('+') &&
				/^\+\d+$/.test(value)
			)
		}

		if (object.type === 'email') {
			// Валидация email: базовая проверка формата
			return typeof value === 'string' && /^\S+@\S+\.\S+$/.test(value)
		}

		return false
	}

	public defaultMessage(args: ValidationArguments): string {
		const object = args.object as SendOtpRequest

		if (object.type === 'phone') {
			return 'Invalid phone number'
		}
		if (object.type === 'email') {
			return 'Invalid email'
		}
		return 'Invalid identifier'
	}
}
