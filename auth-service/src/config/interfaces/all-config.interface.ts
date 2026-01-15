<<<<<<< HEAD
import { DatabaseConfig } from './database.interface';
import { GrpcConfig } from './grpc.interface';
import { RedisConfig } from './redis.interface';
=======
import type { DatabaseConfig } from "./database.interface";
import type { GrpcConfig } from "./grpc.interface";
import type { PassportConfig } from "./passport.interface";
import type { RedisConfig } from "./redis.interface";
>>>>>>> 7c9850c (save)

export interface AllConfig {
  database: DatabaseConfig;
  grpc: GrpcConfig;
  passport: PassportConfig;
  redis: RedisConfig;
}
