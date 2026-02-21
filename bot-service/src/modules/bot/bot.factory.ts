import { session, Telegraf } from "telegraf";
import { registerBotHandlers } from "./handlers";
import { CONFIG } from "../../config";
import type { Session, TelegrafContext } from "../../shared/interfaces";

export const createBot = () => {
  const bot = new Telegraf<TelegrafContext>(CONFIG.BOT_TOKEN);

  bot.use(
    session({
      defaultSession: (): Session => ({ id: undefined }),
    }),
  );
  registerBotHandlers(bot);
  return bot;
};
