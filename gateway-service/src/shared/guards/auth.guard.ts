import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException
} from '@nestjs/common'
import { PassportService } from '@ticket_for_cinema/passport'
import type { Request } from 'express'

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private readonly passportService: PassportService) {}
	public canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest()

		const token = this.extractTokenFromHeader(request)

		if (!token) throw new UnauthorizedException('Token is empty')

		const result = this.passportService.verifyToken(token)

		if (!result.valid) throw new UnauthorizedException(result.reason)
		request.user = { id: result.userId }

		return true
	}

	private extractTokenFromHeader(request: Request): string | undefined {
		const header = request.headers.authorization
		if (!header) throw new UnauthorizedException('No authorization header')

		if (!header.startsWith('Bearer '))
			throw new UnauthorizedException('Invalid authorization header')

		const token = header.replace(/^Bearer\s+/i, '').trim()

		return token
	}
}
