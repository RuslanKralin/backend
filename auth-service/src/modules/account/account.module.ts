import { Module } from "@nestjs/common";
import { AccountService } from "./account.service";
import { AccountController } from "./account.controller";
import { AccountRepo } from "./account.repo";
import { OtpService } from "../otp/otp.service";
import { UserRepo } from "@/shared/repositories";

@Module({
  controllers: [AccountController],
  providers: [AccountService, AccountRepo, UserRepo, OtpService],
})
export class AccountModule {}
