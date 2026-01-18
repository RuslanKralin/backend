import { Module } from "@nestjs/common";
import { AccountService } from "./account.service";
import { AccountController } from "./account.controller";
import { AccountRepo } from "./account.repo";

@Module({
  controllers: [AccountController],
  providers: [AccountService, AccountRepo],
})
export class AccountModule {}
