import { Controller } from "@nestjs/common";
import { AuthService } from "./auth.service";

import { GrpcMethod } from "@nestjs/microservices";
import type {
  SendOtpRequest,
  SendOtpResponse,
} from "@ticket_for_cinema/contracts/gen/auth";

@Controller()
export class AuthController {
  public constructor(private readonly authService: AuthService) {}

  @GrpcMethod("AuthService", "SendOtp")
  public async sentOtp(data: SendOtpRequest): Promise<SendOtpResponse> {
    return await this.authService.sendOtp(data);
  }
}
