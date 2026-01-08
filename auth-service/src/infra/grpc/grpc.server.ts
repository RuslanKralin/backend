/* eslint-disable prettier/prettier */
import { INestApplication, Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
// import { PROTO_PATH } from "@ticket_for_cinema/contracts";
import type { AllConfig } from '@/config/interfaces';
import { grpcLoader, grpcPackages, grpcProtoPath } from './gprc.options';

export const createGrpcServer = async (
  app: INestApplication,
  configService: ConfigService<AllConfig>,
) => {
  const logger = new Logger(createGrpcServer.name);

  // Получаем конфигурацию gRPC
  const grpcConfig = configService.get<AllConfig['grpc']>('grpc', {
    infer: true,
  });

  if (!grpcConfig) {
    throw new Error('Конфигурация gRPC не найдена');
  }

  const url = `${grpcConfig.GRPC_HOST}:${grpcConfig.GRPC_PORT}`;

  // Создаем и подключаем gRPC микросервис
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: grpcPackages,
      protoPath: grpcProtoPath,
      url,
      loader: grpcLoader,
    },
  });

  await app.startAllMicroservices();

  logger.log(`🚀 gRPC сервер запущен на: ${url}`);
};
