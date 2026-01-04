import { Injectable } from "@nestjs/common";
import { Account } from "@prisma/generated/client";
import type {
  SendOtpRequest,
  SendOtpResponse,
} from "@ticket_for_cinema/contracts/gen/auth";
import { AuthRepo } from "./auth.repo";

@Injectable()
export class AuthService {
  constructor(private readonly authRepo: AuthRepo) {}
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
    return {
      ok: true,
    };
  }
}
