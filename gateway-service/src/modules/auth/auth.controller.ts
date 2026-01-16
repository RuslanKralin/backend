import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiOperation } from '@nestjs/swagger'
// import type { RefreshTokensRequest } from '@ticket_for_cinema/contracts/gen/auth'
import type { Request, Response } from 'express'

import { AuthGrpcClient } from './auth.grpc'
import { SendOtpRequest, VerifyOtpRequest } from './dto'

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
}
