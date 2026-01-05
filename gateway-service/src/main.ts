import { Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { SwaggerModule } from '@nestjs/swagger'

import { AppModule } from './core/app.module'
import {
	getCorsConfig,
	getSwaggerConfig,
	getValidationPipeConfig
} from './core/config'
import { GrpcExceptionFilter } from './shared/filters'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)

	const config = app.get(ConfigService)
	const logger = new Logger()

	app.useGlobalPipes(new ValidationPipe(getValidationPipeConfig()))
	app.useGlobalFilters(new GrpcExceptionFilter()) // Global gRPC exception filter

	app.enableCors(getCorsConfig(config))

	const port = config.getOrThrow<number>('HTTP_PORT')
	const host = config.getOrThrow<string>('HTTP_HOST')

	const swaggerConfig = getSwaggerConfig()

	const documentFactory = () =>
		SwaggerModule.createDocument(app, swaggerConfig)
	SwaggerModule.setup('/docs', app, documentFactory, {
		yamlDocumentUrl: '/openapi.yaml'
	})

	await app.listen(port)

	logger.log(`🚀🚀🚀 Gateway is running on: ${host}:${port}`)
	logger.log(`🚀Swagger is running on: ${host}/docs`)
}
bootstrap()
