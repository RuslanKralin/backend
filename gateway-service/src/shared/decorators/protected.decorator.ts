import { applyDecorators, UseGuards } from '@nestjs/common'
import type { Role } from '@ticket_for_cinema/contracts/gen/account'

import { AuthGuard, RolesGuard } from '../guards'

import { Roles } from './roles.decorator'

export const Protected = (...roles: Role[]) => {
	if (roles.length === 0) return applyDecorators(UseGuards(AuthGuard))

	return applyDecorators(Roles(...roles), UseGuards(AuthGuard, RolesGuard))
}
