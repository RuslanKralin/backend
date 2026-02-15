import { IsString, IsUrl } from "class-validator";

export class TelegramValidator {
  @IsString()
  public TELEGRAM_BOT_ID: string;

  @IsString()
  public TELEGRAM_BOT_TOKEN: string;

  @IsString()
  public TELEGRAM_BOT_USERNAME: string;

  @IsUrl()
  public TELEGRAM_REDIRECT_ORIGIN: string;
}
