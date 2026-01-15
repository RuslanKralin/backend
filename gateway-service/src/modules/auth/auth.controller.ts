import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiOperation } from '@nestjs/swagger'
import type { Response } from 'express'

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
		console.log(dto)

		const { accessToken, refreshToken } =
			await this.authGrpcClient.verifyOtp(dto)

		res.cookie('refreshToken', refreshToken, {
			httpOnly: true,
			secure:
				this.configService.getOrThrow<string>('NODE_ENV') ===
				'development'
					? false
					: true,
			domain: this.configService.getOrThrow<string>('COOKIES_DOMAIN'),
			sameSite: 'lax',
			maxAge: 30 * 24 * 60 * 60 * 1000
		})
		return { accessToken }
	}
}
