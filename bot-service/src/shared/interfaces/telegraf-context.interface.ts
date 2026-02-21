import type { Context, Telegraf } from "telegraf";

export interface Session {
  id?: string;
}

export interface TelegrafContext extends Context {
  session: Session;
}
