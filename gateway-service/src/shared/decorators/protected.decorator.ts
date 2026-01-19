import { applyDecorators, UseGuards } from '@nestjs/common'

import { AuthGuard, RolesGuard } from '../guards'

import { Roles } from './roles.decorator'

export const Protected = (...roles: string[]) => {
	if (roles.length === 0) return applyDecorators(UseGuards(AuthGuard))

	return applyDecorators(Roles(...roles), UseGuards(AuthGuard, RolesGuard))
}
