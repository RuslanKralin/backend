import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { ClientGrpc } from '@nestjs/microservices'
import type {
	AuthServiceClient,
	RefreshTokensRequest,
	RefreshTokensResponse,
	SendOtpRequest,
	SendOtpResponse,
	VerifyOtpRequest,
	VerifyOtpResponse
} from '@ticket_for_cinema/contracts/gen/auth'
import { lastValueFrom, throwError } from 'rxjs'
import { catchError } from 'rxjs/operators'

@Injectable()
export class AuthGrpcClient implements OnModuleInit {
	// Приватный клиент для общения с auth сервисом через gRPC
	private authClient: AuthServiceClient

	// В конструкторе получаем gRPC клиент, который настроен в auth.module.ts
	// AUTH_PACKAGE - это имя нашего gRPC подключения к auth сервису
	public constructor(
		@Inject('AUTH_PACKAGE') private readonly client: ClientGrpc
	) {}

	// Этот метод вызывается автоматически когда модуль инициализируется
	// Здесь мы получаем конкретный сервис AuthService из общего gRPC клиента
	public onModuleInit() {
		this.authClient =
			this.client.getService<AuthServiceClient>('AuthService')
	}

	// Метод для отправки OTP - это обертка над gRPC вызовом
	// Принимает данные запроса и возвращает промис с ответом
	public async sendOtp(data: SendOtpRequest): Promise<SendOtpResponse> {
		// authClient.sendOtp(data) возвращает Observable (поток данных)
		// lastValueFrom преобразует Observable в Promise для удобства использования
		return lastValueFrom(this.authClient.sendOtp(data))
	}

	public async verifyOtp(data: VerifyOtpRequest): Promise<VerifyOtpResponse> {
		return lastValueFrom(
			this.authClient.verifyOtp(data).pipe(
				catchError(error => {
					// Преобразуем gRPC ошибку в RpcException чтобы фильтр её поймал
					return throwError(() => error)
				})
			)
		)
	}

	public async refreshTokens(
		data: RefreshTokensRequest
	): Promise<RefreshTokensResponse> {
		return lastValueFrom(
			this.authClient.refreshTokens(data).pipe(
				catchError(error => {
					// Преобразуем gRPC ошибку в RpcException чтобы фильтр её поймал
					return throwError(() => error)
				})
			)
		)
	}
}
