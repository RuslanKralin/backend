import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { PROTO_PATH } from '@ticket_for_cinema/contracts'
import { PassportModule } from '@ticket_for_cinema/passport'
import { AuthGuard } from 'src/shared/guards'

import { AccountGrpcClient } from './account.grpc'

@Module({
	imports: [
		ClientsModule.registerAsync([
			{
				name: 'ACCOUNT_PACKAGE',
				useFactory: (config: ConfigService) => ({
					transport: Transport.GRPC,
					options: {
						package: ['account.v1'],
						protoPath: [PROTO_PATH.ACCOUNT],
						url: config.getOrThrow<string>('AUTH_GRPC_URL'),
						loader: {
							keepCase: false,
							longs: String,
							enums: String,
							defaults: true,
							oneofs: true
						}
					}
				}),
				inject: [ConfigService]
			}
		])
	],

	providers: [AccountGrpcClient],
	exports: [AccountGrpcClient, ClientsModule]
})
export class AccountModule {}
