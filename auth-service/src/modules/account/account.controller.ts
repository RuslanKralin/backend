import { Controller } from "@nestjs/common";
import { AccountService } from "./account.service";
import type {
  GetAccountRequest,
  GetAccountResponse,
} from "@ticket_for_cinema/contracts/gen/account";
import { GrpcMethod } from "@nestjs/microservices";

@Controller()
export class AccountController {
  public constructor(private readonly accountService: AccountService) {}

  @GrpcMethod("AccountService", "GetAccount")
  public async getAccount(
    data: GetAccountRequest,
  ): Promise<GetAccountResponse> {
    return await this.accountService.getAccount(data);
  }
}
