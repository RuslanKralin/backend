import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '@ticket_for_cinema/contracts/gen/account'
import { AccountGrpcClient } from 'src/modules/account/account.grpc'

import { ROLES_KEY } from '../decorators'

@Injectable()
export class RolesGuard implements CanActivate {
	public constructor(
		private readonly reflector: Reflector,
		private readonly accountClient: AccountGrpcClient
	) {}

	public async canActivate(context: ExecutionContext): Promise<boolean> {
		const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass()
		])

		if (!required || required.length === 0) return true

		const request = context.switchToHttp().getRequest()
		const user = request.user

		if (!user) throw new ForbiddenException('User missing')

		const account = await this.accountClient.getAccount({ id: user.id })
		if (!account) throw new NotFoundException('Account not found')

		if (!required.includes(account.role)) {
			throw new ForbiddenException(
				'You dont have permission to access this resource'
			)
		}

		return true
	}
}
