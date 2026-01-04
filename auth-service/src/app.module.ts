import { Module } from "@nestjs/common";
import { AuthModule } from "./modules/auth/auth.module";
import { PrismaModule } from "./infra/prisma/prisma.module";

@Module({
  imports: [AuthModule, PrismaModule],
})
export class AppModule {}
