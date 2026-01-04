import { Module } from "@nestjs/common";
import { AuthModule } from "./modules/auth/auth.module";
import { PrismaModule } from "./infra/prisma/prisma.module";
import { RedisModule } from "./infra/redis/redis.module";
import { OtpModule } from "./modules/otp/otp.module";

@Module({
  imports: [PrismaModule, RedisModule, AuthModule, OtpModule],
})
export class AppModule {}
