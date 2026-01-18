import { PrismaService } from "@/infra/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { Account } from "@prisma/generated/client";

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
}
