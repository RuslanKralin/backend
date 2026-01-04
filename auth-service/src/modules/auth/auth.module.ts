import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { PrismaModule } from "@/infra/prisma/prisma.module";
import { AuthRepo } from "./auth.repo";

import { OtpModule } from "@/modules/otp/otp.module";

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepo],
  imports: [PrismaModule, OtpModule],
})
export class AuthModule {}
