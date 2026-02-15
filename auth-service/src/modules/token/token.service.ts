import type { AllConfig } from "@/config";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportService, TokenPayload } from "@ticket_for_cinema/passport";

@Injectable()
export class TokenService {
  private readonly ACCESS_TOKEN_TTL: number;
  private readonly REFRESH_TOKEN_TTL: number;

  public constructor(
    private readonly configService: ConfigService<AllConfig>,
    private readonly passportService: PassportService,
  ) {
    this.ACCESS_TOKEN_TTL = this.configService.get("passport.accessTokenTtl", {
      infer: true,
    });
    this.REFRESH_TOKEN_TTL = this.configService.get(
      "passport.refreshTokenTtl",
      { infer: true },
    );
  }

  public generateTokens(userId: string) {
    const payload: TokenPayload = {
      sub: userId,
    };
    const accessToken = this.passportService.generateToken(
      String(payload.sub),
      this.ACCESS_TOKEN_TTL,
    );
    const refreshToken = this.passportService.generateToken(
      String(payload.sub),
      this.REFRESH_TOKEN_TTL,
    );
    return { accessToken, refreshToken };
  }

  public verify(token: string) {
    return this.passportService.verifyToken(token);
  }
}
