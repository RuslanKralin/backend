import type { Telegraf } from "telegraf";
import type { TelegrafContext } from "@/shared/interfaces/telegraf-context.interface";
import type {
  TelegramCompleteRequest,
  TelegramCompleteResponse,
} from "@ticket_for_cinema/contracts/gen/auth";
import { authClient } from "@/infra/grpc/auth.client";

export const registerContactHandler = (bot: Telegraf<TelegrafContext>) => {
  bot.on("contact", async (ctx) => {
    const phone = ctx.message.contact.phone_number;

    console.log("📞 Получен номер телефона:", phone);
    console.log("🔍 ctx.session:", (ctx as any).session);
    console.log("🔍 ctx.session.id:", (ctx as any).session?.id);

    // await ctx.reply(
    //   `✅ Спасибо! Ваш номер телефона получен: ${phone}\n\nАвторизация завершена!`,
    // );
    if (!ctx.chat.id || !(ctx as any).session?.id) {
      console.log("❌ Ошибка: отсутствует chat.id или session.id");
      return ctx.reply("Произошла ошибка. Начните процесс через сайт");
    }
    const request: TelegramCompleteRequest = {
      sessionId: ctx.session.id,
      phone,
    };

    const response = await new Promise<TelegramCompleteResponse>(
      (resolve, reject) => {
        authClient.telegramComplete(
          request,
          (err: any, response: TelegramCompleteResponse) => {
            if (err) reject(err);
            else resolve(response);
          },
        );
      },
    );

    const { sessionId } = response;

    await ctx.reply("✅ Авторизация завершена!", {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Вернуться на сайт",
              url: `https://ticket-for-cinema.com/auth/tg-finylize?session_id=${sessionId}`,
            },
          ],
        ],
        // убираем кнопку ввода номера телефона
        remove_keyboard: true,
      },
    });
  });
};
