import { Module } from "@nestjs/common";
import { TelegramService } from "./telegram.service";
import { TelegramRepository } from "./telegram.repository";
import { TelegramController } from "./telegram.controller";
import { RedisService } from "@/infra/redis/redis.service";
import { TokenService } from "../token/token.service";

@Module({
  controllers: [TelegramController],
  providers: [TelegramService, TelegramRepository, RedisService, TokenService],
  exports: [TelegramService],
})
export class TelegramModule {}
