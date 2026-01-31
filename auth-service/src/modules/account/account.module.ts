import { Module } from "@nestjs/common";
import { AccountService } from "./account.service";
import { AccountController } from "./account.controller";
import { AccountRepo } from "./account.repo";
import { UserRepo } from "@/shared/repositories";
import { OtpModule } from "../otp/otp.module";

@Module({
  imports: [OtpModule],
  controllers: [AccountController],
  providers: [AccountService, AccountRepo, UserRepo],
})
export class AccountModule {}
