import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { PROTO_PATH } from '@ticket_for_cinema/contracts'

import { AuthController } from './auth.controller'
import { AuthGrpcClient } from './auth.grpc'

@Module({
	imports: [
		ClientsModule.registerAsync([
			{
				name: 'AUTH_PACKAGE',
				useFactory: (config: ConfigService) => ({
					transport: Transport.GRPC,
					options: {
						package: 'auth.v1', // то что указали в proto файле
						protoPath: PROTO_PATH.AUTH,
						url: config.getOrThrow<string>('AUTH_GRPC_URL')
					}
				}),
				inject: [ConfigService]
			}
		])
	],
	controllers: [AuthController],
	providers: [AuthGrpcClient]
})
export class AuthModule {}
