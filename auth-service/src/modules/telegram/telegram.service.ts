import type { AllConfig } from "@/config";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  TelegramInitResponse,
  TelegramVerifyRequest,
} from "@ticket_for_cinema/contracts/gen/auth";
import { TelegramRepository } from "./telegram.repository";
import { RedisService } from "@/infra/redis/redis.service";
import { createHash, createHmac, randomBytes } from "crypto";
import { TokenService } from "../token/token.service";
import { RpcException } from "@nestjs/microservices";
import { RpcStatus } from "@ticket_for_cinema/common";

@Injectable()
export class TelegramService {
  private readonly BOT_ID: string;
  private readonly BOT_TOKEN: string;
  private readonly BOT_USERNAME: string;
  private readonly REDIRECT_ORIGIN: string;

  public constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService<AllConfig>,
    private readonly telegramRepository: TelegramRepository,
    private readonly tokenService: TokenService,
  ) {
    this.BOT_ID = this.configService.get("telegram.botId", { infer: true });
    this.BOT_TOKEN = this.configService.get("telegram.botToken", {
      infer: true,
    });
    this.BOT_USERNAME = this.configService.get("telegram.botUsername", {
      infer: true,
    });
    this.REDIRECT_ORIGIN = this.configService.get("telegram.redirectOrigin", {
      infer: true,
    });
  }

  /**
   * Генерирует URL для OAuth аутентификации через Telegram
   * @returns {URL} Объект с URL для перенаправления пользователя на Telegram
   */
  public getAuthUrl(): TelegramInitResponse {
    // Создаём базовый URL для OAuth Telegram
    const url = new URL(`https://oauth.telegram.org/auth`);

    // Добавляем ID бота, который будет аутентифицировать пользователя
    url.searchParams.append("bot_id", this.BOT_ID);

    // Указываем домен, с которого происходит запрос (для безопасности)
    url.searchParams.append("origin", this.REDIRECT_ORIGIN);

    // Запрашиваем доступ к данным пользователя (email и т.д.)
    url.searchParams.append("request_access", "write");

    // URL, на который Telegram вернёт пользователя после аутентификации
    url.searchParams.append("return_to", this.REDIRECT_ORIGIN);

    // Возвращаем объект с полным URL для перенаправления
    return { url: url.href };
  }

  public async verify(data: TelegramVerifyRequest) {
    const isAuthValid = this.checkTelegramAuth(data.query);
    if (!isAuthValid) {
      throw new RpcException({
        code: RpcStatus.UNAUTHENTICATED,
        message: "Invalid Telegram auth",
      });
    }
    const telegramId = data.query.id;
    const existingUser =
      await this.telegramRepository.findUserByTelegramId(telegramId);

    // это при повторном входе, если уже зарегался и чисто заходит через телеграм
    if (existingUser && existingUser.phone) {
      return this.tokenService.generateTokens(existingUser.id);
    }
    const sessionId = randomBytes(16).toString("hex");
    await this.redisService.set(
      `telegram_session:${sessionId}`,
      JSON.stringify({
        telegramId,
        username: data.query.username,
      }),
      "EX",
      300,
    );
    return { url: `http://t.me/${this.BOT_USERNAME}?start=${sessionId}` };
  }

  // TODO: разобраться с этим
  private checkTelegramAuth(query: Record<string, string>) {
    const hash = query.hash;
    if (!hash) {
      return false;
    }
    const dataCheckArr = Object.keys(query)
      .filter((key) => key !== "hash")
      .sort()
      .map((k) => `${k}=${query[k]}`);

    const dataCheckStr = dataCheckArr.join("\n");
    const secretKey = createHash("sha256")
      .update(`${this.BOT_ID}:${this.BOT_TOKEN}`)
      .digest("hex");
    const hmac = createHmac("sha256", secretKey)
      .update(dataCheckStr)
      .digest("hex");

    const isAuthValid = hmac === hash;

    return isAuthValid;
  }
}
