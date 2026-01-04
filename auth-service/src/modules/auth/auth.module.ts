import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { PrismaModule } from "@/infra/prisma/prisma.module";
import { AuthRepo } from "./auth.repo";

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepo],
  imports: [PrismaModule],
})
export class AuthModule {}
