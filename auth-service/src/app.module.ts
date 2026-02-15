import { Module } from "@nestjs/common";
import { AuthModule } from "./modules/auth/auth.module";
import { PrismaModule } from "./infra/prisma/prisma.module";
import { RedisModule } from "./infra/redis/redis.module";
import { OtpModule } from "./modules/otp/otp.module";
import { ConfigModule } from "@nestjs/config";

import {
  redisEnv,
  telegramEnv,
  passportEnv,
  databaseEnv,
  grpcEnv,
} from "./config/env";

import { AccountModule } from "./modules/account/account.module";
import { TelegramModule } from "./modules/telegram/telegram.module";
import { TokenModule } from './modules/token/token.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseEnv, grpcEnv, passportEnv, redisEnv, telegramEnv],
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    OtpModule,
    AccountModule,
    TelegramModule,
    TokenModule,
  ],
})
export class AppModule {}
