import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AccountGrpcClient } from 'src/modules/account/account.grpc'

import { ROLES_KEY } from '../decorators'

@Injectable()
export class RolesGuard implements CanActivate {
	public constructor(
		private readonly reflector: Reflector,
		private readonly accountClient: AccountGrpcClient
	) {}

	public async canActivate(context: ExecutionContext): Promise<boolean> {
		const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass()
		])

		if (!required || required.length === 0) return true

		const request = context.switchToHttp().getRequest()
		const user = request.user

		if (!user) throw new ForbiddenException('User missing')

		const account = await this.accountClient.getAccount({ id: user.id })
		if (!account) throw new NotFoundException('Account not found')

		// gRPC может вернуть роль как число (0, 1) или как строку ('USER', 'ADMIN')
		let roleString: string
		if (typeof account.role === 'number') {
			roleString = account.role === 1 ? 'ADMIN' : 'USER'
		} else {
			roleString = String(account.role)
		}

		console.log('Required roles:', required)
		console.log('Account role (raw):', account.role, typeof account.role)
		console.log('Account role (converted):', roleString)
		console.log('Includes check:', required.includes(roleString))

		if (!required.includes(roleString)) {
			throw new ForbiddenException(
				'You dont have permission to access this resource'
			)
		}

		return true
	}
}
