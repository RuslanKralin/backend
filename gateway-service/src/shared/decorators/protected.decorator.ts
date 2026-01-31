import { applyDecorators, UseGuards } from '@nestjs/common'

import { AuthGuard, RolesGuard } from '../guards'

import { Roles } from './roles.decorator'

// универсальный декоратор для защиты маршрутов в данном случае мы прокидываем и роли и гуарды чтобы декоратор мог проверить авторизацию и права доступа
export const Protected = (...roles: string[]) => {
	if (roles.length === 0) return applyDecorators(UseGuards(AuthGuard))

	return applyDecorators(Roles(...roles), UseGuards(AuthGuard, RolesGuard))
}
