import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
	Logger
} from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { Response } from 'express'

import { grpcStatusToHttpStatus } from '../utils/grpc-to-http-status'

// Ловим оба типа исключений: gRPC и HTTP
@Catch(RpcException, HttpException)
export class GrpcExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger(GrpcExceptionFilter.name)

	catch(exception: RpcException | HttpException, host: ArgumentsHost) {
		// Получаем доступ к HTTP контексту (request/response)
		const ctx = host.switchToHttp()
		const response = ctx.getResponse<Response>()
		const request = ctx.getRequest()

		// Значения по умолчанию для неизвестных ошибок
		let status = HttpStatus.INTERNAL_SERVER_ERROR
		let message = 'Internal server error'

		// Обрабатываем обычные HTTP исключения (валидация, 404 и т.д.)
		if (exception instanceof HttpException) {
			status = exception.getStatus()
			const exceptionResponse = exception.getResponse()
			message =
				typeof exceptionResponse === 'string'
					? exceptionResponse
					: (exceptionResponse as any).message || 'HTTP error'
		} else if (exception instanceof RpcException) {
			// Главное: обрабатываем gRPC ошибки от микросервисов

			// Получаем данные ошибки из RpcException
			const errorData = exception.getError()

			// Проверяем что ошибка в формате gRPC (объект с code/details)
			if (typeof errorData === 'object' && errorData !== null) {
				const grpcError = errorData as any
				// Конвертируем gRPC статус в HTTP статус
				status = grpcStatusToHttpStatus[grpcError.code] || 500
				// Берем сообщение из details или message
				message = grpcError.details || grpcError.message || 'gRPC error'
			} else if (typeof errorData === 'string') {
				// Обрабатываем gRPC ошибки в формате строки "5 NOT_FOUND: message"
				const match = errorData.match(/^(\d+)\s+([^:]+):\s*(.*)$/)
				if (match) {
					const grpcCode = parseInt(match[1])
					status = grpcStatusToHttpStatus[grpcCode] || 500
					message = match[3] || 'gRPC error'
				} else {
					message = errorData
				}
			} else {
				// Если ошибка в простом формате
				message = 'gRPC error'
			}
		}

		// Логируем ошибку для отладки
		this.logger.error(
			`${request.method} ${request.url} - Status: ${status} - Error: ${message}`,
			exception.stack
		)

		// Отправляем унифицированный ответ клиенту
		response.status(status).json({
			statusCode: status,
			timestamp: new Date().toISOString(),
			path: request.url,
			message
		})
	}
}
