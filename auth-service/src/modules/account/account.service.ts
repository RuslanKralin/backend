import { Injectable } from "@nestjs/common";
import type {
  GetAccountRequest,
  GetAccountResponse,
} from "@ticket_for_cinema/contracts/dist/gen/account";
import { Role } from "@ticket_for_cinema/contracts/dist/gen/account";
import { AccountRepo } from "./account.repo";
import { RpcException } from "@nestjs/microservices";
import { RpcStatus, convertEnum } from "@ticket_for_cinema/common";
import type { InitEmailChangeRequest } from "@ticket_for_cinema/contracts/dist/gen/account";
import { UserRepo } from "../user/user.repo";
import { OtpService } from "../otp/otp.service";

type OtpType = "phone" | "email";

@Injectable()
export class AccountService {
  public constructor(
    private readonly accountRepo: AccountRepo,
    private readonly userRepo: UserRepo,
    private readonly otpService: OtpService,
  ) {}

  public async getAccount(
    data: GetAccountRequest,
  ): Promise<GetAccountResponse> {
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

  public async initEmailCange(data: InitEmailChangeRequest) {
    const { email } = data;

    const existingUser = await this.userRepo.findUserByEmail(email);
    if (existingUser) {
      throw new RpcException({
        code: RpcStatus.BAD_REQUEST,
        details: "User with this email already exists",
      });
    }

    const code = await this.otpService.sendOtp(email, "email" as OtpType);
    return { code };
    // TODO: Send email with verification code
  }
}
