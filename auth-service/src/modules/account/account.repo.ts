import { PrismaService } from "@/infra/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import type { Account, PendingContactChange } from "@prisma/generated/client";

@Injectable()
export class AccountRepo {
  public constructor(private readonly prisma: PrismaService) {}

  public async findUserById(id: string): Promise<Account | null> {
    return await this.prisma.account.findUnique({
      where: {
        id,
      },
    });
  }

  public findPendingChange(
    accountId: string,
    type: "email" | "phone",
  ): Promise<PendingContactChange> {
    return this.prisma.pendingContactChange.findUnique({
      where: {
        accountId_type: {
          accountId,
          type,
        },
      },
    });
  }

  // тут либо создаем либо обновляем
  public usertPendingChange(data: {
    accountId: string;
    type: "email" | "phone";
    value: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<PendingContactChange> {
    return this.prisma.pendingContactChange.upsert({
      where: {
        accountId_type: {
          accountId: data.accountId,
          type: data.type,
        },
      },
      create: data,
      update: data,
    });
  }

  public deletePandingChange({
    accountId,
    type,
  }: {
    accountId: string;
    type: "email" | "phone";
  }) {
    return this.prisma.pendingContactChange.delete({
      where: {
        accountId_type: {
          accountId,
          type,
        },
      },
    });
  }
}
