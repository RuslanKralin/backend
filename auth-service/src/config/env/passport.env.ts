import { registerAs } from "@nestjs/config";
import type { PassportConfig } from "../interfaces";
import { validateEnv } from "../../shared/utils";
import { PassportValidator } from "../validators/passport.validator";

export const passportEnv = registerAs<PassportConfig>("passport", () => {
  validateEnv(process.env, PassportValidator);
  return {
    secretKey: process.env.PASSPORT_SECRET_KEY,
    accessTokenTtl: parseInt(process.env.PASSPORT_ACCESS_TTL),
    refreshTokenTtl: parseInt(process.env.PASSPORT_REFRESH_TTL),
  };
});
