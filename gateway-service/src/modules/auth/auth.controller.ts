import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { ApiOperation } from '@nestjs/swagger'

import { AuthGrpcClient } from './auth.grpc'
import { SendOtpRequest } from './dto'

@Controller('auth')
export class AuthController {
	public constructor(private readonly authGrpcClient: AuthGrpcClient) {}
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
}
