import { registerAs } from "@nestjs/config";
import type { TelegramConfig } from "../interfaces";
import { validateEnv } from "../../shared/utils";
import { TelegramValidator } from "../validators";

export const telegramEnv = registerAs<TelegramConfig>("telegram", () => {
  validateEnv(process.env, TelegramValidator);
  return {
    botId: process.env.TELEGRAM_BOT_ID,
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    botUsername: process.env.TELEGRAM_BOT_USERNAME,
    redirectOrigin: process.env.TELEGRAM_REDIRECT_ORIGIN,
  };
});
