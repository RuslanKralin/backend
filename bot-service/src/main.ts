process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import "reflect-metadata";
import { createBot } from "./modules/bot/bot.factory";

async function bootstrap() {
  try {
    console.log("Creating bot...");
    const bot = createBot();

    console.log("Testing bot connection...");
    await bot.telegram.getMe();
    console.log("✅ Bot connected successfully!");

    console.log("Launching bot...");
    await bot.launch();
    console.log("✅ Bot is running!");

    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
  } catch (e) {
    console.log("Bot error ❌:");
    console.log("Error message:", e.message);
    console.log("Error details:", e);
    process.exit(1);
  }
}

bootstrap();
