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
			// Валидация телефона: начинается с +, затем только цифры
			return (
				typeof value === 'string' &&
				value.startsWith('+') &&
				/^\+\d+$/.test(value) &&
				value.length > 8
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
