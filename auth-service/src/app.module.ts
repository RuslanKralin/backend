import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './infra/prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { OtpModule } from './modules/otp/otp.module';
import { ConfigModule } from '@nestjs/config';
import { grpcEnv } from './config/env/grpc.env';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [grpcEnv] }),
    PrismaModule,
    RedisModule,
    AuthModule,
    OtpModule,
  ],
})
export class AppModule {}
