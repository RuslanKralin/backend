import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: "auth.v1", // то что указали в proto файле
      protoPath: "node_modules/@ticket_for_cinema/contracts/proto/auth.proto",
      url: "localhost:50051",
      loader: {
        keepCase: false, // чтобы не было проблем с регистром
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
bootstrap();
