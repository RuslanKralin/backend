/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable } from "@nestjs/common";
import type {
  ConfirmEmailChangeRequest,
  ConfirmEmailChangeResponse,
  GetAccountRequest,
  GetAccountResponse,
  ConfirmPhoneChangeRequest,
  ConfirmPhoneChangeResponse,
  InitEmailChangeRequest,
  InitPhoneChangeRequest,
} from "@ticket_for_cinema/contracts/dist/gen/account";
import { Role } from "@ticket_for_cinema/contracts/dist/gen/account";
import { AccountRepo } from "./account.repo";
import { RpcException } from "@nestjs/microservices";
import { RpcStatus, convertEnum } from "@ticket_for_cinema/common";
// import type { InitEmailChangeRequest } from "@ticket_for_cinema/contracts/dist/gen/account";
import { UserRepo } from "../../shared/repositories/user.repo";
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

  public async initEmailChange(data: InitEmailChangeRequest) {
    const { email, userId } = data;

    const existingUser = await this.userRepo.findUserByEmail(email);
    if (existingUser) {
      throw new RpcException({
        code: RpcStatus.INVALID_ARGUMENT,
        details: "User with this email already exists",
      });
    }

    const { code, hash } = await this.otpService.sendOtp(
      email,
      "email" as OtpType,
    );

    console.log("code", code);

    await this.accountRepo.usertPendingChange({
      accountId: userId,
      type: "email",
      value: email,
      codeHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    return {
      ok: true,
    };
  }

  public async confirmEmailChange(
    data: ConfirmEmailChangeRequest,
  ): Promise<ConfirmEmailChangeResponse> {
    const { email, userId, code } = data;

    const pending = await this.accountRepo.findPendingChange(userId, "email");

    if (!pending) {
      throw new RpcException({
        code: RpcStatus.NOT_FOUND,
        details: "Pending change not found",
      });
    }
    if (pending.value !== email) {
      throw new RpcException({
        code: RpcStatus.INVALID_ARGUMENT,
        details: "Missmatched email",
      });
    }
    if (pending.expiresAt < new Date()) {
      throw new RpcException({
        code: RpcStatus.NOT_FOUND,
        details: "Pending change expired",
      });
    }
    await this.otpService.verifyOtp(pending.value, code, "email");

    await this.userRepo.updateAccount(userId, { email, isEmailVerified: true });

    await this.accountRepo.deletePandingChange({
      accountId: userId,
      type: "email",
    });

    return {
      ok: true,
    };
  }

  // тоже самое для телефона
  public async initPhoneChange(data: InitPhoneChangeRequest) {
    const { phone, userId } = data;

    const existingUser = await this.userRepo.findUserByPhone(phone);
    if (existingUser) {
      throw new RpcException({
        code: RpcStatus.INVALID_ARGUMENT,
        details: "User with this email already exists",
      });
    }

    const { code, hash } = await this.otpService.sendOtp(
      phone,
      "phone" as OtpType,
    );

    console.log("code", code);

    await this.accountRepo.usertPendingChange({
      accountId: userId,
      type: "phone",
      value: phone,
      codeHash: hash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    return {
      ok: true,
    };
  }

  public async confirmPhoneChange(
    data: ConfirmPhoneChangeRequest,
  ): Promise<ConfirmPhoneChangeResponse> {
    const { phone, userId, code } = data;

    const pending = await this.accountRepo.findPendingChange(userId, "phone");

    if (!pending) {
      throw new RpcException({
        code: RpcStatus.NOT_FOUND,
        details: "Pending change not found",
      });
    }
    if (pending.value !== phone) {
      throw new RpcException({
        code: RpcStatus.INVALID_ARGUMENT,
        details: "Missmatched phone",
      });
    }
    if (pending.expiresAt < new Date()) {
      throw new RpcException({
        code: RpcStatus.NOT_FOUND,
        details: "Pending change expired",
      });
    }
    await this.otpService.verifyOtp(pending.value, code, "phone");

    await this.userRepo.updateAccount(userId, { phone, isPhoneVerified: true });

    await this.accountRepo.deletePandingChange({
      accountId: userId,
      type: "phone",
    });

    return {
      ok: true,
    };
  }
}
