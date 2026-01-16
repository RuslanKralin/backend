/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { Account } from '@prisma/generated/client';

import type {
  RefreshTokensRequest,
  RefreshTokensResponse,
  SendOtpRequest,
  SendOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from '@ticket_for_cinema/contracts/gen/auth';
import { AuthRepo } from './auth.repo';
import { OtpService } from '@/modules/otp/otp.service';
import { RpcException } from '@nestjs/microservices';
import { RpcStatus } from '@ticket_for_cinema/common';
import { PassportService, TokenPayload } from '@ticket_for_cinema/passport';
import { ConfigService } from '@nestjs/config';
import type { AllConfig } from '@/config';

@Injectable()
export class AuthService {
  private readonly ACCESS_TOKEN_TTL: number;
  private readonly REFRESH_TOKEN_TTL: number;

  constructor(
    private readonly configService: ConfigService<AllConfig>,
    private readonly authRepo: AuthRepo,

    private readonly otpService: OtpService,

    private readonly passportService: PassportService,
  ) {
    this.ACCESS_TOKEN_TTL = this.configService.get('passport.accessTokenTtl', {
      infer: true,
    });
    this.REFRESH_TOKEN_TTL = this.configService.get(
      'passport.refreshTokenTtl',
      { infer: true },
    );
  }
  public async sendOtp(data: SendOtpRequest): Promise<SendOtpResponse> {
    const { identifier, type } = data;
    let account: Account | null;
    if (type === 'phone') {
      account = await this.authRepo.findUserByPhone(identifier);
    } else {
      account = await this.authRepo.findUserByEmail(identifier);
    }
    if (!account) {
      account = await this.authRepo.createAccount({
        email: type === 'email' ? identifier : undefined,
        phone: type === 'phone' ? identifier : undefined,
      });
    }

    const code = await this.otpService.sendOtp(
      identifier,
      type as 'phone' | 'email',
    );

    return {
      ok: true,
      code: code.code,
    } as SendOtpResponse;
  }

  public async verifyOtp(data: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    const { identifier, type, code } = data;

    await this.otpService.verifyOtp(
      identifier,
      code,
      type as 'phone' | 'email',
    );

    let account: Account | null;
    if (type === 'phone') {
      account = await this.authRepo.findUserByPhone(identifier);
    } else {
      account = await this.authRepo.findUserByEmail(identifier);
    }

    if (!account)
      throw new RpcException({
        code: RpcStatus.NOT_FOUND,
        message: 'Account not found',
      });

    if (type === 'phone' && !account.isPhoneVerified) {
      await this.authRepo.updateAccount(account.id, { isPhoneVerified: true });
    }
    if (type === 'email' && !account.isEmailVerified) {
      await this.authRepo.updateAccount(account.id, { isEmailVerified: true });
    }
    return this.generateTokens(account.id);
  }

  private generateTokens(userId: string) {
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

  public async refreshTokens(
    data: RefreshTokensRequest,
  ): Promise<RefreshTokensResponse> {
    const { refreshToken } = data;

    const result = this.passportService.verifyToken(refreshToken);
    if (!result.valid) {
      throw new RpcException({
        code: RpcStatus.UNAUTHENTICATED,
        details: 'Invalid refresh token',
      });
    }

    return this.generateTokens(result.userId);
  }
}
