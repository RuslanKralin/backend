import { Markup, Telegraf } from "telegraf";

export const registerStartHandler = (bot: Telegraf) => {
  bot.start(async (ctx) => {
    const sessionId = ctx.startPayload;

    console.log("🔵 /start получен");
    console.log("📦 startPayload:", sessionId);

    // Инициализируем сессию если её нет
    if (!(ctx as any).session) {
      (ctx as any).session = {};
    }

    if (sessionId) {
      (ctx as any).session.id = sessionId;
      console.log("✅ sessionId сохранен в сессию:", sessionId);
    } else {
      console.log("⚠️ sessionId отсутствует!");
    }

    await ctx.reply(
      "Для завершения авторизации отправте свой номер телефона",
      Markup.keyboard([[Markup.button.contactRequest("Отправить номер")]])
        .resize()
        .oneTime(),
    );
  });
};
