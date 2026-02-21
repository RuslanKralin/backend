import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Req,
	Res,
	UnauthorizedException,
	UseGuards
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { lastValueFrom } from 'rxjs'
import { CurrentUserId, Protected } from 'src/shared/decorators'
import { AuthGuard } from 'src/shared/guards'

import { AuthGrpcClient } from './auth.grpc'
import {
	SendOtpRequest,
	TelegramFinalizeRequest,
	TelegramVerifyRequest,
	VerifyOtpRequest
} from './dto'

// добавляем user в Request временно
interface RequestWithUser extends Request {
	user: { id: string }
}

enum Roles {
	USER = 'USER',
	ADMIN = 'ADMIN'
}

@Controller('auth')
export class AuthController {
	public constructor(
		private readonly authGrpcClient: AuthGrpcClient,
		private readonly configService: ConfigService
	) {}
	@ApiOperation({
		summary: 'Send OTP code',
		description: 'Send OTP code to user'
	})
	@Post('send-otp')
	@HttpCode(200)
	public async sendOtp(@Body() dto: SendOtpRequest) {
		console.log(dto)
		return this.authGrpcClient.sendOtp(dto)
	}

	@ApiOperation({
		summary: 'Verify OTP code',
		description: 'Verify OTP code sent to user'
	})
	@Post('verify-otp')
	@HttpCode(200)
	public async verifyOtp(
		@Body() dto: VerifyOtpRequest,
		@Res({ passthrough: true }) res: Response
	) {
		// сначала получаем токен чтоб потом отправить его в куки
		const { accessToken, refreshToken } =
			await this.authGrpcClient.verifyOtp(dto)

		res.cookie('refreshToken', refreshToken, {
			httpOnly: true, // защита от доступа к куки через js (XSS атаки)
			secure:
				this.configService.getOrThrow<string>('NODE_ENV') ===
				'development'
					? false
					: true,
			domain: this.configService.getOrThrow<string>('COOKIES_DOMAIN'),
			sameSite: 'lax', // защита от CSRF атак
			maxAge: 30 * 24 * 60 * 60 * 1000
		})
		return { accessToken }
	}

	@ApiOperation({
		summary: 'Refresh tokens',
		description: 'Refresh tokens'
	})
	@Post('refresh')
	@HttpCode(200)
	public async refreshTokens(
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response
	) {
		const refreshToken = req.cookies.refreshToken

		const { accessToken, refreshToken: newRefreshToken } =
			await this.authGrpcClient.refreshTokens({
				refreshToken
			})

		res.cookie('refreshToken', newRefreshToken, {
			httpOnly: true, // защита от доступа к куки через js (XSS атаки)
			secure:
				this.configService.getOrThrow<string>('NODE_ENV') ===
				'development'
					? false
					: true,
			domain: this.configService.getOrThrow<string>('COOKIES_DOMAIN'),
			sameSite: 'lax', // защита от CSRF атак
			maxAge: 30 * 24 * 60 * 60 * 1000
		})
		return { accessToken }
	}

	@ApiOperation({
		summary: 'Logout',
		description: 'Logout user and clear cookies'
	})
	@Post('logout')
	@HttpCode(200)
	public async logout(@Res({ passthrough: true }) res: Response) {
		res.cookie('refreshToken', '', {
			httpOnly: true,
			secure:
				this.configService.getOrThrow<string>('NODE_ENV') ===
				'development'
					? false
					: true,
			domain: this.configService.getOrThrow<string>('COOKIES_DOMAIN'),
			sameSite: 'lax',
			expires: new Date(0)
		})
		return { ok: true }
	}

	@ApiBearerAuth()
	@Protected('ADMIN')
	@Get('account')
	@HttpCode(200)
	public async getAccount(@CurrentUserId() userId: string) {
		return { id: userId }
	}

	@Get('telegram')
	@HttpCode(HttpStatus.OK)
	public async telegramInit() {
		return this.authGrpcClient.telegramInit()
	}

	@Post('telegram/veryfy')
	@HttpCode(HttpStatus.OK)
	public async telegramVerify(
		@Body() dto: TelegramVerifyRequest,
		@Res({ passthrough: true }) res: Response
	) {
		const query = JSON.parse(atob(dto.tgAuthResult))
		console.log('Telegram query:', query)
		const result = await this.authGrpcClient.telegramVerify({
			query
		})

		if ('url' in result && result.url) {
			return result
		}

		if (result.accessToken && result.refreshToken) {
			const { accessToken, refreshToken } = result
			res.cookie('refreshToken', refreshToken, {
				httpOnly: true, // защита от доступа к куки через js (XSS атаки)
				secure:
					this.configService.getOrThrow<string>('NODE_ENV') ===
					'development'
						? false
						: true,
				domain: this.configService.getOrThrow<string>('COOKIES_DOMAIN'),
				sameSite: 'lax', // защита от CSRF атак
				maxAge: 30 * 24 * 60 * 60 * 1000
			})
			return { accessToken }
		}

		throw new UnauthorizedException('Telegram verify failed')
	}

	@Post('telegram/finalize')
	@HttpCode(HttpStatus.OK)
	public async finalizeTelegramLogin(
		@Body() dto: TelegramFinalizeRequest,
		@Res({ passthrough: true }) res: Response
	) {
		const { sessionId } = dto

		const { accessToken, refreshToken } =
			await this.authGrpcClient.telegramConsume({ sessionId })

		res.cookie('refreshToken', refreshToken, {
			httpOnly: true, // защита от доступа к куки через js (XSS атаки)
			secure:
				this.configService.getOrThrow<string>('NODE_ENV') ===
				'development'
					? false
					: true,
			domain: this.configService.getOrThrow<string>('COOKIES_DOMAIN'),
			sameSite: 'lax', // защита от CSRF атак
			maxAge: 30 * 24 * 60 * 60 * 1000
		})
		return { accessToken }
	}
}
