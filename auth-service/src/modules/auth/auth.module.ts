import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { PrismaModule } from "@/infra/prisma/prisma.module";
import { AuthRepo } from "./auth.repo";

import { TelegramModule } from "@/modules/telegram/telegram.module";
import { UserRepo } from "@/shared/repositories";
import { TokenService } from "../token/token.service";
import { OtpModule } from "../otp/otp.module";

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepo, UserRepo, TokenService],
  imports: [PrismaModule, TelegramModule, OtpModule],
})
export class AuthModule {}
