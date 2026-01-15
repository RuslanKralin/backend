import { IsInt, IsString } from "class-validator";

export class PassportValidator {
  @IsString()
  public PASSPORT_SECRET_KEY: string;

  @IsInt()
  public PASSPORT_ACCESS_TTL: number;

  @IsInt()
  public PASSPORT_REFRESH_TTL: number;
}
