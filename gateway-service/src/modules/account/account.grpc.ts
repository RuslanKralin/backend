import { Inject, Injectable } from '@nestjs/common'
import { ClientGrpc } from '@nestjs/microservices'
import {
	AccountServiceClient,
	GetAccountRequest,
	GetAccountResponse
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
	// Принимает данные запроса и возвращает промис с ответом
	public async getAccount(
		data: GetAccountRequest
	): Promise<GetAccountResponse> {
		// authClient.sendOtp(data) возвращает Observable (поток данных)
		// lastValueFrom преобразует Observable в Promise для удобства использования
		return lastValueFrom(this.getAccountService().getAccount(data))
	}
}
