import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpStatus,
	Logger
} from '@nestjs/common'
import { Response } from 'express'

import { grpcStatusToHttpStatus } from '../utils/grpc-to-http-status'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(GlobalExceptionFilter.name)

	catch(exception: any, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse<Response>()
		const request = ctx.getRequest()

		let status = HttpStatus.INTERNAL_SERVER_ERROR
		let message = 'Internal server error'

		// Обрабатываем gRPC ошибки
		if (exception?.message && typeof exception.message === 'string') {
			const grpcMatch = exception.message.match(
				/^(\d+)\s+([^:]+):\s*(.*)$/
			)

			if (grpcMatch) {
				const grpcCode = parseInt(grpcMatch[1])
				status =
					grpcStatusToHttpStatus[grpcCode] ||
					HttpStatus.INTERNAL_SERVER_ERROR
				message = grpcMatch[3] || 'gRPC error'
			} else {
				message = exception.message
			}
		} else if (exception?.response) {
			// HTTP ошибки
			status = exception.status || HttpStatus.INTERNAL_SERVER_ERROR
			message = exception.response.message || exception.message
		} else if (exception?.message) {
			message = exception.message
		}

		this.logger.error(
			`${request.method} ${request.url} - Status: ${status} - Error: ${message}`,
			exception.stack
		)

		response.status(status).json({
			statusCode: status,
			timestamp: new Date().toISOString(),
			path: request.url,
			message
		})
	}
}
