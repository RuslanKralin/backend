import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { AllConfig } from './config/interfaces/all-config.interface';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Получаем ConfigService с типизацией
  const configService = app.get<ConfigService<AllConfig>>(ConfigService);

  // Доступ к конфигурации с проверкой типов
  const grpcConfig = configService.get<AllConfig['grpc']>('grpc', {
    infer: true,
  });

  if (!grpcConfig) {
    throw new Error('Конфигурация gRPC не найдена');
  }

  const url = `${grpcConfig.GRPC_HOST}:${grpcConfig.GRPC_PORT}`;

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'auth.v1',
      protoPath: 'node_modules/@ticket_for_cinema/contracts/proto/auth.proto',
      url,
      loader: {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      },
    },
  });

  await app.startAllMicroservices();
  await app.init();
}

bootstrap().catch(err => {
  console.error('Ошибка при запуске приложения:', err);
  process.exit(1);
});
