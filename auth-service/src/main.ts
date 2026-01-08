import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from './config/interfaces/all-config.interface';
import { createGrpcServer } from './infra/grpc/grpc.server';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Получаем ConfigService с типизацией
  const config = app.get<ConfigService<AllConfig>>(ConfigService);

  // Доступ к конфигурации с проверкой типов
  const grpcConfig = config.get<AllConfig['grpc']>('grpc', {
    infer: true,
  });

  if (!grpcConfig) {
    throw new Error('Конфигурация gRPC не найдена');
  }

  // Создаем gRPC сервер
  await createGrpcServer(app, config);

  await app.init();
}

bootstrap().catch(err => {
  console.error('Ошибка при запуске приложения:', err);
  process.exit(1);
});
