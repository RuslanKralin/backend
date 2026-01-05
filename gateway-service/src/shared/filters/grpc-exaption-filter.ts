import { Catch, ExceptionFilter } from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'

import { grpcStatusToHttpStatus } from '../utils/grpc-to-http-status'

@Catch(RpcException)
export class GrpcExceptionFilter implements ExceptionFilter {
	public catch(exception: RpcException) {
		// Implementation will be added later
	}
	// функция чтоб убедться что ошибка является grpc
	private isGrpcError(exception: any) {}
}
