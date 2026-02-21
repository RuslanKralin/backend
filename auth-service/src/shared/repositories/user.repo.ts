import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { Account } from "@prisma/generated/client";
import type { AccountUpdateInput } from "@prisma/generated/models";
import { AccountCreateInput } from "@prisma/generated/models";

@Injectable()
export class UserRepo {
  private readonly logger = new Logger(UserRepo.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findUserByPhone(phone: string): Promise<Account | null> {
    try {
      return await this.prisma.account.findUnique({ where: { phone } });
    } catch (error) {
      this.logger.error(`Error finding user by phone: ${error}`);
      throw error;
    }
  }

  public async findUserByEmail(email: string): Promise<Account | null> {
    return await this.prisma.account.findUnique({ where: { email } });
  }

  public async updateAccount(
    id: string,
    data: AccountUpdateInput,
  ): Promise<Account> {
    return await this.prisma.account.update({ where: { id }, data });
  }

  public async createAccount(data: AccountCreateInput): Promise<Account> {
    return await this.prisma.account.create({ data });
  }
}
