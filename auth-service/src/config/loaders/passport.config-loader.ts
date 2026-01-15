/* eslint-disable prettier/prettier */
import { ConfigService } from "@nestjs/config";
import type { AllConfig } from "../interfaces";
import { PassportOptions } from "@ticket_for_cinema/passport";

export function getPassportConfig(
  configService: ConfigService<AllConfig>
): PassportOptions {
  return {
    secretKey: configService.get("passport.secretKey", { infer: true }),
  };
}
