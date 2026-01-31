import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import {
	ConfirmEmailChangeRequest,
	ConfirmPhoneChangeRequest,
	InitEmailChangeRequest,
	InitPhoneChangeRequest
} from '@ticket_for_cinema/contracts/gen/account'
import { CurrentUserId, Protected } from 'src/shared/decorators'

import { AccountGrpcClient } from './account.grpc'
import {
	ConfirmEmailChangeDto,
	ConfirmPhoneChangeDto,
	InitEmailChangeDto,
	InitPhoneChangeDto
} from './dto'

@Controller('account')
export class AccountController {
	constructor(private readonly accountGrpcClient: AccountGrpcClient) {}

	@ApiOperation({
		summary: 'Init email change',
		description: 'Sends confirmation code to new email'
	})
	@ApiBearerAuth()
	@Protected()
	@Post('email/init')
	@HttpCode(HttpStatus.OK)
	public async initEmailChange(
		@Body() dto: InitEmailChangeDto,
		@CurrentUserId() userId: string
	) {
		return this.accountGrpcClient.initEmailChange({ ...dto, userId })
	}

	@ApiOperation({
		summary: 'Confirm email change',
		description: 'Verify confirmation code and update user email'
	})
	@ApiBearerAuth()
	@Protected()
	@Post('email/confirm')
	@HttpCode(HttpStatus.OK)
	public async confirmEmailChange(
		@Body() dto: ConfirmEmailChangeDto,
		@CurrentUserId() userId: string
	) {
		return this.accountGrpcClient.confirmEmailChange({ ...dto, userId })
	}

	// ------------------------------------------------------------------------
	@ApiOperation({
		summary: 'Init phone change',
		description: 'Sends confirmation code to new phone'
	})
	@ApiBearerAuth()
	@Protected()
	@Post('phone/init')
	@HttpCode(HttpStatus.OK)
	public async initPhoneChange(
		@Body() dto: InitPhoneChangeDto,
		@CurrentUserId() userId: string
	) {
		return this.accountGrpcClient.initPhoneChange({ ...dto, userId })
	}

	@ApiOperation({
		summary: 'Confirm phone change',
		description: 'Verify confirmation code and update user phone'
	})
	@ApiBearerAuth()
	@Protected()
	@Post('phone/confirm')
	@HttpCode(HttpStatus.OK)
	public async confirmPhoneChange(
		@Body() dto: ConfirmPhoneChangeDto,
		@CurrentUserId() userId: string
	) {
		return this.accountGrpcClient.confirmPhoneChange({ ...dto, userId })
	}
}
