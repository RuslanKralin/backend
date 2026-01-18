import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { ClientGrpc } from '@nestjs/microservices'
import {
	AccountServiceClient,
	GetAccountRequest,
	GetAccountResponse
} from '@ticket_for_cinema/contracts/gen/account'
import { lastValueFrom, throwError } from 'rxjs'
import { catchError } from 'rxjs/operators'

@Injectable()
export class AccountGrpcClient implements OnModuleInit {
	// Приватный клиент для общения с account сервисом через gRPC
	private accountService: AccountServiceClient

	public constructor(
		@Inject('AUTH_PACKAGE') private readonly client: ClientGrpc
	) {}

	// Этот метод вызывается автоматически когда модуль инициализируется
	// Здесь мы получаем конкретный сервис AuthService из общего gRPC клиента
	public onModuleInit() {
		this.accountService =
			this.client.getService<AccountServiceClient>('AccountService')
	}

	// Метод для отправки OTP - это обертка над gRPC вызовом
	// Принимает данные запроса и возвращает промис с ответом
	public async getAccount(
		data: GetAccountRequest
	): Promise<GetAccountResponse> {
		// authClient.sendOtp(data) возвращает Observable (поток данных)
		// lastValueFrom преобразует Observable в Promise для удобства использования
		return lastValueFrom(this.accountService.getAccount(data))
	}
}
