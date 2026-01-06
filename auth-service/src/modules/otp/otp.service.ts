import { Injectable } from "@nestjs/common";
import { RedisService } from "../../infra/redis/redis.service";
import * as crypto from "crypto";
import { Logger } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";

type OtpType = "phone" | "email";

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  public constructor(private readonly redisService: RedisService) {}

  public async sendOtp(
    identifier: string,
    // eslint-disable-next-line prettier/prettier
    type: OtpType
  ): Promise<{ code: string }> {
    const { code, hash } = this.generateCode();

    await this.redisService.set(`otp:${type}:${identifier}`, hash, "EX", 300);

    this.logger.log(`OTP ${code} stored for ${type}:${identifier}`);

    return { code };
  }

  private generateCode(): { code: string; hash: string } {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = crypto.createHash("sha256").update(code).digest("hex");
    this.logger.log(`Generated OTP: ${code}, Hash: ${hash}`);
    return { code, hash };
  }

  public async verifyOtp(identifier: string, otp: string, type: OtpType) {
    const storedHash = await this.redisService.get(`otp:${type}:${identifier}`);
    if (!storedHash) {
      throw new RpcException({
        code: 5,
        message: "Invalid or expired code",
      });
    }

    const inputHash = crypto.createHash("sha256").update(otp).digest("hex");

    if (inputHash !== storedHash) {
      throw new RpcException({
        code: 5,
        message: "Invalid or expired code",
      });
    } else {
      await this.redisService.del(`otp:${type}:${identifier}`);
    }
  }
}
