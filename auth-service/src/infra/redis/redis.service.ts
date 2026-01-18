import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { Redis } from "ioredis";

import { ConfigService } from "@nestjs/config";
import type { AllConfig } from "@/config";

@Injectable()
export class RedisService
  extends Redis
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisService.name);
  public constructor(private readonly configService: ConfigService<AllConfig>) {
    super({
      username: configService.get("redis.user", { infer: true }),
      password: configService.get("redis.password", { infer: true }),
      host: configService.get("redis.host", { infer: true }),
      port: configService.get("redis.port", { infer: true }),
      maxRetriesPerRequest: 5, // ограничиваем повторные подключения при ошибках (избегаем бесконечных попыток)
      enableOfflineQueue: true, // включаем проверку готовности соединения при холодном старте сервиса
    });
  }

  // запускается автоматически при иниц. модуля
  // eslint-disable-next-line @typescript-eslint/require-await
  public async onModuleInit(): Promise<void> {
    const start = Date.now();
    this.logger.log("starting redis connection");

    this.on("connection", () => {
      this.logger.log("Redis connected");
    });

    this.on("ready", () => {
      const ms = Date.now() - start;
      this.logger.log(`Redis is ready (connected in ${ms}ms)`);
    });

    this.on("error", (error) => {
      this.logger.error("Redis error:", {
        error: error.message ?? error,
      });
    });

    this.on("close", () => {
      this.logger.warn("Redis connection closed");
    });

    this.on("reconnecting", () => {
      this.logger.log("Redis reconnecting...");
    });
  }

  public async onModuleDestroy(): Promise<void> {
    this.logger.log("Redis service destroyed");

    try {
      await this.quit();
      this.logger.log("Redis connection closed gracefully");
    } catch (error) {
      this.logger.error("Error closing Redis connection:", {
        error: error.message ?? error,
      });
    }
  }
}
