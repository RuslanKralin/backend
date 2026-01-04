import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { Account } from "@prisma/generated/client";
import { AccountCreateInput } from "@prisma/generated/models";

@Injectable()
export class AuthRepo {
  private readonly logger = new Logger(AuthRepo.name);

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

  public async createAccount(data: AccountCreateInput): Promise<Account> {
    return await this.prisma.account.create({ data });
  }
}
