import { Module } from "@nestjs/common";
import { AuthModule } from "./modules/auth/auth.module";
import { PrismaModule } from "./infra/prisma/prisma.module";
import { RedisModule } from "./infra/redis/redis.module";
import { OtpModule } from "./modules/otp/otp.module";
import { ConfigModule } from "@nestjs/config";
import { grpcEnv } from "./config/env/grpc.env";
import { databaseEnv } from "./config/env/database.env";
import { redisEnv } from "./config";
import { passportEnv } from "./config/env/passport.env";
// import { PassportModule } from "./modules/passport/passport.module";
import { AccountModule } from "./modules/account/account.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseEnv, grpcEnv, passportEnv, redisEnv],
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    OtpModule,
    AccountModule,
  ],
})
export class AppModule {}
