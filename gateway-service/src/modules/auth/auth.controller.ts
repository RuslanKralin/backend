import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { ApiOperation } from '@nestjs/swagger'

import { SendOtpRequest } from './dto'

@Controller('auth')
export class AuthController {
	@ApiOperation({
		summary: 'Send OTP code',
		description: 'Send OTP code to user'
	})
	@Post('send-otp')
	@HttpCode(200)
	public async sendOtp(@Body() dto: SendOtpRequest) {
		console.log(dto)
		return {
			ok: true
		}
	}
}
