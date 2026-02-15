/* eslint-disable @typescript-eslint/await-thenable */
import { Controller } from "@nestjs/common";
import { TelegramService } from "./telegram.service";
import { GrpcMethod } from "@nestjs/microservices";
import type {
  TelegramInitResponse,
  TelegramVerifyRequest,
  TelegramVerifyResponse,
} from "@ticket_for_cinema/contracts/gen/auth";

@Controller()
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @GrpcMethod("AuthService", "TelegramInit")
  public async getAuthUrl(): Promise<TelegramInitResponse> {
    return await this.telegramService.getAuthUrl();
  }

  @GrpcMethod("AuthService", "TelegramVerify")
  public async verify(
    data: TelegramVerifyRequest,
  ): Promise<TelegramVerifyResponse> {
    return await this.telegramService.verify(data);
  }
}
