import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/prisma/prisma.service";
import { Account } from "@prisma/generated/client";

@Injectable()
export class TelegramRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async findUserByTelegramId(
    telegramId: string,
  ): Promise<Account | null> {
    return await this.prisma.account.findUnique({ where: { telegramId } });
  }
}
