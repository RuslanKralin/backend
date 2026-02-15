import { Module } from "@nestjs/common";
import { TokenService } from "./token.service";
import { PassportModule } from "@ticket_for_cinema/passport";
import { getPassportConfig } from "@/config";
import { ConfigService } from "@nestjs/config";

@Module({
  providers: [TokenService],
  exports: [TokenService],
  imports: [
    PassportModule.registerAsync({
      useFactory: getPassportConfig,
      inject: [ConfigService],
    }),
  ],
})
export class TokenModule {}
