import { Injectable } from "@nestjs/common";
import { Account } from "@prisma/generated/client";

import type {
  RefreshTokensRequest,
  RefreshTokensResponse,
  SendOtpRequest,
  SendOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from "@ticket_for_cinema/contracts/dist/gen/auth";
import { AuthRepo } from "./auth.repo";
import { OtpService } from "@/modules/otp/otp.service";
import { RpcException } from "@nestjs/microservices";
import { RpcStatus } from "@ticket_for_cinema/common";

import { UserRepo } from "@/shared/repositories";
import { TokenService } from "../token/token.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepo: AuthRepo,
    private readonly userRepo: UserRepo,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
  ) {}
  public async sendOtp(data: SendOtpRequest): Promise<SendOtpResponse> {
    const { identifier, type } = data;
    let account: Account | null;
    if (type === "phone") {
      account = await this.userRepo.findUserByPhone(identifier);
    } else {
      account = await this.userRepo.findUserByEmail(identifier);
    }
    if (!account) {
      account = await this.authRepo.createAccount({
        email: type === "email" ? identifier : undefined,
        phone: type === "phone" ? identifier : undefined,
      });
    }

    const code = await this.otpService.sendOtp(
      identifier,
      type as "phone" | "email",
    );

    return {
      ok: true,
      code: code.code,
    } as SendOtpResponse;
  }

  public async verifyOtp(data: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    const { identifier, type, code } = data;

    await this.otpService.verifyOtp(
      identifier,
      code,
      type as "phone" | "email",
    );

    let account: Account | null;
    if (type === "phone") {
      account = await this.userRepo.findUserByPhone(identifier);
    } else {
      account = await this.userRepo.findUserByEmail(identifier);
    }

    if (!account)
      throw new RpcException({
        code: RpcStatus.NOT_FOUND,
        message: "Account not found",
      });

    if (type === "phone" && !account.isPhoneVerified) {
      await this.userRepo.updateAccount(account.id, { isPhoneVerified: true });
    }
    if (type === "email" && !account.isEmailVerified) {
      await this.userRepo.updateAccount(account.id, { isEmailVerified: true });
    }
    return this.tokenService.generateTokens(account.id);
  }

  public refreshTokens(data: RefreshTokensRequest): RefreshTokensResponse {
    const { refreshToken } = data;

    const result = this.tokenService.verify(refreshToken);
    if (!result.valid) {
      throw new RpcException({
        code: RpcStatus.UNAUTHENTICATED,
        details: "Invalid refresh token",
      });
    }

    return this.tokenService.generateTokens(result.userId);
  }
}
