import { Telegraf } from "telegraf";
import { registerStartHandler } from "./start.handler";
import { registerContactHandler } from "./contact.handler";
import type { TelegrafContext } from "@/shared/interfaces/telegraf-context.interface";

export function registerBotHandlers(bot: Telegraf<TelegrafContext>) {
  registerStartHandler(bot);
  registerContactHandler(bot);
}
