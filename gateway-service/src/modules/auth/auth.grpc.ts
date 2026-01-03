import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { ClientGrpc } from '@nestjs/microservices'
import {
	AuthServiceClient,
	SendOtpRequest,
	SendOtpResponse
} from '@ticket_for_cinema/contracts/gen/auth'
import { lastValueFrom } from 'rxjs'

@Injectable()
export class AuthGrpcClient implements OnModuleInit {
	private authClient: AuthServiceClient
	public constructor(
		@Inject('AUTH_PACKAGE') private readonly client: ClientGrpc
	) {}

	public onModuleInit() {
		this.authClient =
			this.client.getService<AuthServiceClient>('AuthService')
	}

	public async sendOtp(data: SendOtpRequest): Promise<SendOtpResponse> {
		return lastValueFrom(this.authClient.sendOtp(data))
	}
}
