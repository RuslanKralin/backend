import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { Account } from "@prisma/generated/client";

@Injectable()
export class UserRepo {
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
}
