import { DocumentBuilder } from '@nestjs/swagger'

export function getSwaggerConfig() {
	return new DocumentBuilder()
		.setTitle('Gateway Service')
		.setDescription('The Gateway Service API description')
		.setVersion('1.0')
		.addBearerAuth()
		.addTag('gateway')
		.build()
}
