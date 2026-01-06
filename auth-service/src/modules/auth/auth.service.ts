/* eslint-disable prettier/prettier */
import { Injectable } from "@nestjs/common";
import { Account } from "@prisma/generated/client";
import type {
  SendOtpRequest,
  SendOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from "@ticket_for_cinema/contracts/gen/auth";
import { AuthRepo } from "./auth.repo";
import { OtpService } from "@/modules/otp/otp.service";
import { RpcException } from "@nestjs/microservices";

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepo: AuthRepo,

    private readonly otpService: OtpService
  ) {}
  public async sendOtp(data: SendOtpRequest): Promise<SendOtpResponse> {
    const { identifier, type } = data;
    let account: Account | null;
    if (type === "phone") {
      account = await this.authRepo.findUserByPhone(identifier);
    } else {
      account = await this.authRepo.findUserByEmail(identifier);
    }
    if (!account) {
      account = await this.authRepo.createAccount({
        email: type === "email" ? identifier : undefined,
        phone: type === "phone" ? identifier : undefined,
      });
    }

    const code = await this.otpService.sendOtp(
      identifier,
      type as "phone" | "email"
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
      type as "phone" | "email"
    );

    let account: Account | null;
    if (type === "phone") {
      account = await this.authRepo.findUserByPhone(identifier);
    } else {
      account = await this.authRepo.findUserByEmail(identifier);
    }

    if (!account)
      throw new RpcException({ code: 5, message: "Account not found" });

    if (type === "phone" && !account.isPhoneVerified) {
      await this.authRepo.updateAccount(account.id, { isPhoneVerified: true });
    }
    if (type === "email" && !account.isEmailVerified) {
      await this.authRepo.updateAccount(account.id, { isEmailVerified: true });
    }
    return { accessToken: "123456", refreshToken: "987654" };
  }
}
