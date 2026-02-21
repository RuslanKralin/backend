import { Module } from "@nestjs/common";
import { TelegramService } from "./telegram.service";
import { TelegramRepository } from "./telegram.repository";
import { TelegramController } from "./telegram.controller";
import { RedisService } from "@/infra/redis/redis.service";
import { TokenService } from "../token/token.service";
import { UserRepo } from "@/shared/repositories/user.repo";

@Module({
  controllers: [TelegramController],
  providers: [
    TelegramService,
    TelegramRepository,
    RedisService,
    UserRepo,
    TokenService,
  ],
  exports: [TelegramService],
})
export class TelegramModule {}
