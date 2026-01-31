import { Inject, Injectable } from '@nestjs/common'
import { ClientGrpc } from '@nestjs/microservices'
import {
	ConfirmPhoneChangeResponse,
	InitPhoneChangeResponse
} from '@ticket_for_cinema/contracts/dist/gen/account'
import {
	AccountServiceClient,
	ConfirmEmailChangeRequest,
	ConfirmEmailChangeResponse,
	ConfirmPhoneChangeRequest,
	GetAccountRequest,
	GetAccountResponse,
	InitEmailChangeRequest,
	InitEmailChangeResponse,
	InitPhoneChangeRequest
} from '@ticket_for_cinema/contracts/gen/account'
import { lastValueFrom, throwError } from 'rxjs'
import { catchError } from 'rxjs/operators'

@Injectable()
export class AccountGrpcClient {
	// Приватный клиент для общения с account сервисом через gRPC
	private accountService: AccountServiceClient | null = null

	public constructor(
		@Inject('ACCOUNT_PACKAGE') private readonly client: ClientGrpc
	) {}

	// Ленивая инициализация сервиса - получаем при первом вызове
	private getAccountService(): AccountServiceClient {
		if (!this.accountService) {
			this.accountService =
				this.client.getService<AccountServiceClient>('AccountService')
		}
		return this.accountService
	}

	// Метод для отправки OTP - это обертка над gRPC вызовом
	// Принимает данные запроса и возвращает промис с ответом!
	public async getAccount(
		data: GetAccountRequest
	): Promise<GetAccountResponse> {
		// authClient.sendOtp(data) возвращает Observable (поток данных)
		// lastValueFrom преобразует Observable в Promise для удобства использования
		return lastValueFrom(this.getAccountService().getAccount(data))
	}

	public async initEmailChange(
		data: InitEmailChangeRequest
	): Promise<InitEmailChangeResponse> {
		// authClient.sendOtp(data) возвращает Observable (поток данных)
		// lastValueFrom преобразует Observable в Promise для удобства использования
		return lastValueFrom(this.getAccountService().initEmailChange(data))
	}

	public async confirmEmailChange(
		data: ConfirmEmailChangeRequest
	): Promise<ConfirmEmailChangeResponse> {
		// authClient.sendOtp(data) возвращает Observable (поток данных)
		// lastValueFrom преобразует Observable в Promise для удобства использования
		return lastValueFrom(this.getAccountService().confirmEmailChange(data))
	}

	public async initPhoneChange(
		data: InitPhoneChangeRequest
	): Promise<InitPhoneChangeResponse> {
		// authClient.sendOtp(data) возвращает Observable (поток данных)
		// lastValueFrom преобразует Observable в Promise для удобства использования
		return lastValueFrom(this.getAccountService().initPhoneChange(data))
	}

	public async confirmPhoneChange(
		data: ConfirmPhoneChangeRequest
	): Promise<ConfirmPhoneChangeResponse> {
		// authClient.sendOtp(data) возвращает Observable (поток данных)
		// lastValueFrom преобразует Observable в Promise для удобства использования
		return lastValueFrom(this.getAccountService().confirmPhoneChange(data))
	}
}
