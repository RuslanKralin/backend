import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { AuthRepo } from './auth.repo';

<<<<<<< HEAD
import { OtpModule } from '@/modules/otp/otp.module';
=======
import { OtpModule } from "@/modules/otp/otp.module";
import { PassportModule } from "@ticket_for_cinema/passport";
// import { passportEnv } from "@/config/env/passport.env";
import { ConfigService } from "@nestjs/config";

import { getPassportConfig } from "@/config/loaders";
>>>>>>> 7c9850c (save)

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepo],
  imports: [
    PrismaModule,
    OtpModule,
    PassportModule.registerAsync({
      useFactory: getPassportConfig,
      inject: [ConfigService],
    }),
  ],
})
export class AuthModule {}
