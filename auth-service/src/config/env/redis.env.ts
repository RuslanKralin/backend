import { registerAs } from "@nestjs/config";
import type { RedisConfig } from "../interfaces";
import { validateEnv } from "../../shared/utils";
import { RedisValidator } from "../validators";

export const redisEnv = registerAs<RedisConfig>("redis", () => {
  validateEnv(process.env, RedisValidator);
  return {
    user: process.env.REDIS_USER,
    password: process.env.REDIS_PASSWORD,
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
  };
});
