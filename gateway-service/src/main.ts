import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)

	const config = app.get(ConfigService)
	const logger = new Logger()

	app.enableCors({
		origin: config.getOrThrow<string>('HTTP_CORS').split(','),
		credentials: true // для поддержки куки чтоб их парсить
	})

	const port = config.getOrThrow<number>('NTTP_PORT')
	const host = config.getOrThrow<string>('NTTP_HOST')

	await app.listen(port)

	logger.log(`Gateway is running on: ${host}:${port}`)
	logger.log(`Swagger is running on: ${host}/docs`)
}
bootstrap()
