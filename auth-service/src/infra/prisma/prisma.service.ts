import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

import type { AllConfig } from "@/config";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService<AllConfig>) {
    const adapter = new PrismaPg({
      user: configService.get("database.user", { infer: true }),
      password: configService.get("database.password", { infer: true }),
      host: configService.get("database.host", { infer: true }),
      port: configService.get("database.port", { infer: true }),
      database: configService.get("database.name", { infer: true }),
    });
    super({
      adapter,
      log: ["error", "warn"],
    });
  }

  public async onModuleInit() {
    const start = Date.now();
    this.logger.log(`Connecting to database...`);

    try {
      await this.$connect();
      const ms = Date.now() - start;
      this.logger.log(`Database connected in ${ms}ms`);
    } catch (error) {
      this.logger.error(`Failed to connect to database: ${error}`);
      throw error;
    }
  }

  public async onModuleDestroy() {
    this.logger.log("Closing database connection...");
    try {
      await this.$disconnect();
      this.logger.log("Database connection closed");
    } catch (error) {
      this.logger.error(`Failed to close database connection: ${error}`);
    }
  }
}
