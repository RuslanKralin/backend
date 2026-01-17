import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException
} from '@nestjs/common'
import type { Request } from 'express'

@Injectable()
export class AuthGuard implements CanActivate {
	public canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<Request>()

		const token = this.extractTokenFromHeader(request)
		if (!token) return false

		return true
	}

	private extractTokenFromHeader(request: Request): string | undefined {
		const header = request.headers.authorization?.split(' ') ?? []
		if (!header) throw new UnauthorizedException('No authorization header')
		const [type, token] = header
		if (type !== 'Bearer')
			throw new UnauthorizedException('Invalid authorization header')
		return token.trim()
	}
}

// доделать
