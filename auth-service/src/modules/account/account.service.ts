import { Injectable } from "@nestjs/common";
import type {
  GetAccountRequest,
  GetAccountResponse,
} from "@ticket_for_cinema/contracts/gen/account";
import { Role } from "@ticket_for_cinema/contracts/gen/account";
import { AccountRepo } from "./account.repo";
import { RpcException } from "@nestjs/microservices";
import { RpcStatus, convertEnum } from "@ticket_for_cinema/common";

@Injectable()
export class AccountService {
  public constructor(private readonly accountRepo: AccountRepo) {}

  public async getAccount(
    data: GetAccountRequest,
  ): Promise<GetAccountResponse> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const account = await this.accountRepo.findUserById(data.id);
    if (!account)
      throw new RpcException({
        code: RpcStatus.NOT_FOUND,
        details: "Account not found",
      });
    return {
      id: account.id,
      phone: account.phone,
      email: account.email,
      isPhoneVerified: account.isPhoneVerified,
      isEmailVerified: account.isEmailVerified,
      role: convertEnum(Role, account.role),
    };
  }
}
