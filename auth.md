# Система авторизации - Подробный конспект

## Оглавление

1. [Общая архитектура](#1-общая-архитектура)
2. [Технологии и паттерны](#2-технологии-и-паттерны)
3. [Поток авторизации (Flow)](#3-поток-авторизации-flow)
4. [Gateway Service](#4-gateway-service)
5. [Auth Service](#5-auth-service)
6. [OTP система](#6-otp-система)
7. [Passport - система токенов](#7-passport---система-токенов)
8. [Безопасность](#8-безопасность)
9. [Конфигурация и валидация](#9-конфигурация-и-валидация)
10. [Примеры использования](#10-примеры-использования)

---

## 1. Общая архитектура

### Микросервисная архитектура

```
┌─────────────────┐     gRPC      ┌─────────────────┐
│                 │ ────────────► │                 │
│  Gateway        │               │  Auth Service   │
│  (HTTP API)     │ ◄──────────── │  (gRPC Server)  │
│                 │               │                 │
└─────────────────┘               └────────┬────────┘
        │                                  │
        │                                  │
   Клиент (браузер)                ┌───────┴───────┐
                                   │               │
                              ┌────▼────┐    ┌─────▼─────┐
                              │  Redis  │    │ PostgreSQL│
                              │  (OTP)  │    │ (Accounts)│
                              └─────────┘    └───────────┘
```

### Почему так?

- **Gateway** - единая точка входа для клиентов (REST API)
- **Auth Service** - изолированный сервис авторизации (gRPC)
- **gRPC** - быстрый бинарный протокол для общения между сервисами
- **Redis** - быстрое хранилище для временных данных (OTP коды)
- **PostgreSQL** - надежное хранилище для аккаунтов

---

## 2. Технологии и паттерны

### Используемые технологии

| Технология              | Назначение                                        |
| ----------------------- | ------------------------------------------------- |
| **NestJS**              | Фреймворк для Node.js с DI (Dependency Injection) |
| **gRPC**                | Протокол связи между микросервисами               |
| **Protocol Buffers**    | Формат сериализации данных для gRPC               |
| **Redis**               | In-memory хранилище для OTP кодов                 |
| **PostgreSQL + Prisma** | База данных и ORM                                 |
| **class-validator**     | Валидация DTO и env переменных                    |
| **class-transformer**   | Преобразование объектов                           |
| **ioredis**             | Redis клиент для Node.js                          |
| **cookie-parser**       | Работа с cookies в Express                        |

### Паттерны проектирования

#### 1. **Repository Pattern** (Паттерн репозиторий)

```typescript
// auth.repo.ts - отделяет логику работы с БД от бизнес-логики
@Injectable()
export class AuthRepo {
  constructor(private readonly prisma: PrismaService) {}

  public async findUserByPhone(phone: string): Promise<Account | null> {
    return await this.prisma.account.findUnique({ where: { phone } });
  }

  public async createAccount(data: AccountCreateInput): Promise<Account> {
    return await this.prisma.account.create({ data });
  }
}
```

**Зачем:** Если завтра нужно сменить Prisma на TypeORM - меняем только репозиторий, сервис не трогаем.

#### 2. **Dependency Injection** (Внедрение зависимостей)

```typescript
// NestJS автоматически создает и внедряет зависимости
@Injectable()
export class AuthService {
  constructor(
    private readonly authRepo: AuthRepo, // Репозиторий
    private readonly otpService: OtpService, // OTP сервис
    private readonly passportService: PassportService // Токены
  ) {}
}
```

**Зачем:** Легко тестировать (можно подменить зависимости моками), код слабо связан.

#### 3. **Dynamic Module Pattern** (Динамические модули)

```typescript
// passport.module.ts - модуль с конфигурацией
@Global()
@Module({})
export class PassportModule {
  public static registerAsync(options: PassportAsyncOptions): DynamicModule {
    return {
      module: PassportModule,
      providers: [optionsProvider, PassportService],
      exports: [PassportService],
    };
  }
}

// Использование в auth.module.ts
PassportModule.registerAsync({
  useFactory: getPassportConfig,
  inject: [ConfigService],
});
```

**Зачем:** Можно передавать конфигурацию при подключении модуля.

#### 4. **Factory Pattern** (Фабрика)

```typescript
// passport.config-loader.ts
export function getPassportConfig(
  configService: ConfigService<AllConfig>
): PassportOptions {
  return {
    secretKey: configService.get("passport.secretKey", { infer: true }),
  };
}
```

**Зачем:** Создание объектов с нужной конфигурацией.

---

## 3. Поток авторизации (Flow)

### Шаг 1: Отправка OTP кода

```
Клиент                    Gateway                   Auth Service              Redis
   │                         │                           │                      │
   │  POST /auth/send-otp    │                           │                      │
   │  {phone: "+7999..."}    │                           │                      │
   │ ───────────────────────►│                           │                      │
   │                         │                           │                      │
   │                         │  gRPC: SendOtp            │                      │
   │                         │ ─────────────────────────►│                      │
   │                         │                           │                      │
   │                         │                           │  SET otp:phone:+7999 │
   │                         │                           │ ────────────────────►│
   │                         │                           │                      │
   │                         │  {ok: true, code: "123456"}                      │
   │                         │ ◄─────────────────────────│                      │
   │                         │                           │                      │
   │  {ok: true}             │                           │                      │
   │ ◄───────────────────────│                           │                      │
```

### Шаг 2: Проверка OTP и получение токенов

```
Клиент                    Gateway                   Auth Service              Redis
   │                         │                           │                      │
   │  POST /auth/verify-otp  │                           │                      │
   │  {phone, code: "123456"}│                           │                      │
   │ ───────────────────────►│                           │                      │
   │                         │                           │                      │
   │                         │  gRPC: VerifyOtp          │                      │
   │                         │ ─────────────────────────►│                      │
   │                         │                           │                      │
   │                         │                           │  GET otp:phone:+7999 │
   │                         │                           │ ────────────────────►│
   │                         │                           │                      │
   │                         │                           │  hash совпал ✓       │
   │                         │                           │  DEL otp:phone:+7999 │
   │                         │                           │ ────────────────────►│
   │                         │                           │                      │
   │                         │  {accessToken, refreshToken}                     │
   │                         │ ◄─────────────────────────│                      │
   │                         │                           │                      │
   │  {accessToken}          │                           │                      │
   │  + Cookie: refreshToken │                           │                      │
   │ ◄───────────────────────│                           │                      │
```

---

## 4. Gateway Service

### Контроллер авторизации

```typescript
// gateway-service/src/modules/auth/auth.controller.ts

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authGrpcClient: AuthGrpcClient,
    private readonly configService: ConfigService
  ) {}

  // Эндпоинт для отправки OTP
  @Post("send-otp")
  @HttpCode(200)
  public async sendOtp(@Body() dto: SendOtpRequest) {
    return this.authGrpcClient.sendOtp(dto);
  }

  // Эндпоинт для проверки OTP
  @Post("verify-otp")
  @HttpCode(200)
  public async verifyOtp(
    @Body() dto: VerifyOtpRequest,
    @Res({ passthrough: true }) res: Response // Доступ к Response для установки cookies
  ) {
    // Получаем токены от Auth Service
    const { accessToken, refreshToken } = await this.authGrpcClient.verifyOtp(
      dto
    );

    // Устанавливаем refresh токен в httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true, // Недоступен из JavaScript (защита от XSS)
      secure: process.env.NODE_ENV !== "development", // HTTPS only в продакшене
      domain: this.configService.getOrThrow<string>("COOKIES_DOMAIN"),
      sameSite: "lax", // Защита от CSRF
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
    });

    // Возвращаем только access токен
    return { accessToken };
  }
}
```

### gRPC клиент

```typescript
// gateway-service/src/modules/auth/auth.grpc.ts

@Injectable()
export class AuthGrpcClient implements OnModuleInit {
  private authClient: AuthServiceClient;

  constructor(@Inject("AUTH_PACKAGE") private readonly client: ClientGrpc) {}

  // Инициализация при старте модуля
  public onModuleInit() {
    this.authClient = this.client.getService<AuthServiceClient>("AuthService");
  }

  // Обертка над gRPC вызовом
  public async sendOtp(data: SendOtpRequest): Promise<SendOtpResponse> {
    // lastValueFrom преобразует Observable в Promise
    return lastValueFrom(this.authClient.sendOtp(data));
  }

  public async verifyOtp(data: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    return lastValueFrom(
      this.authClient
        .verifyOtp(data)
        .pipe(catchError((error) => throwError(() => error)))
    );
  }
}
```

### Настройка gRPC подключения

```typescript
// gateway-service/src/modules/auth/auth.module.ts

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: "AUTH_PACKAGE", // Имя для инъекции
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: "auth.v1", // Пакет из proto файла
            protoPath: PROTO_PATH.AUTH, // Путь к proto файлу
            url: config.getOrThrow<string>("AUTH_GRPC_URL"), // localhost:50051
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthGrpcClient],
})
export class AuthModule {}
```

---

## 5. Auth Service

### Контроллер (gRPC)

```typescript
// auth-service/src/modules/auth/auth.controller.ts

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // gRPC метод - декоратор указывает имя сервиса и метода из proto файла
  @GrpcMethod("AuthService", "SendOtp")
  public async sentOtp(data: SendOtpRequest): Promise<SendOtpResponse> {
    return await this.authService.sendOtp(data);
  }

  @GrpcMethod("AuthService", "VerifyOtp")
  public async verifyOtp(data: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    return await this.authService.verifyOtp(data);
  }
}
```

### Сервис авторизации

```typescript
// auth-service/src/modules/auth/auth.service.ts

@Injectable()
export class AuthService {
  private readonly ACCESS_TOKEN_TTL: number; // Время жизни access токена
  private readonly REFRESH_TOKEN_TTL: number; // Время жизни refresh токена

  constructor(
    private readonly configService: ConfigService<AllConfig>,
    private readonly authRepo: AuthRepo,
    private readonly otpService: OtpService,
    private readonly passportService: PassportService
  ) {
    // Получаем TTL из конфигурации при инициализации
    this.ACCESS_TOKEN_TTL = this.configService.get("passport.accessTokenTtl", {
      infer: true,
    });
    this.REFRESH_TOKEN_TTL = this.configService.get(
      "passport.refreshTokenTtl",
      { infer: true }
    );
  }

  // Отправка OTP кода
  public async sendOtp(data: SendOtpRequest): Promise<SendOtpResponse> {
    const { identifier, type } = data;

    // Ищем или создаем аккаунт
    let account: Account | null;
    if (type === "phone") {
      account = await this.authRepo.findUserByPhone(identifier);
    } else {
      account = await this.authRepo.findUserByEmail(identifier);
    }

    // Если аккаунта нет - создаем новый
    if (!account) {
      account = await this.authRepo.createAccount({
        email: type === "email" ? identifier : undefined,
        phone: type === "phone" ? identifier : undefined,
      });
    }

    // Генерируем и отправляем OTP
    const code = await this.otpService.sendOtp(
      identifier,
      type as "phone" | "email"
    );

    return { ok: true, code: code.code };
  }

  // Проверка OTP и выдача токенов
  public async verifyOtp(data: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    const { identifier, type, code } = data;

    // Проверяем OTP код
    await this.otpService.verifyOtp(
      identifier,
      code,
      type as "phone" | "email"
    );

    // Находим аккаунт
    let account: Account | null;
    if (type === "phone") {
      account = await this.authRepo.findUserByPhone(identifier);
    } else {
      account = await this.authRepo.findUserByEmail(identifier);
    }

    if (!account) {
      throw new RpcException({
        code: RpcStatus.NOT_FOUND,
        message: "Account not found",
      });
    }

    // Отмечаем телефон/email как подтвержденный
    if (type === "phone" && !account.isPhoneVerified) {
      await this.authRepo.updateAccount(account.id, { isPhoneVerified: true });
    }
    if (type === "email" && !account.isEmailVerified) {
      await this.authRepo.updateAccount(account.id, { isEmailVerified: true });
    }

    // Генерируем и возвращаем токены
    return this.generateTokens(account.id);
  }

  // Генерация пары токенов
  private generateTokens(userId: string) {
    const payload: TokenPayload = { sub: userId };

    const accessToken = this.passportService.generateToken(
      String(payload.sub),
      this.ACCESS_TOKEN_TTL
    );

    const refreshToken = this.passportService.generateToken(
      String(payload.sub),
      this.REFRESH_TOKEN_TTL
    );

    return { accessToken, refreshToken };
  }
}
```

### Репозиторий

```typescript
// auth-service/src/modules/auth/auth.repo.ts

@Injectable()
export class AuthRepo {
  private readonly logger = new Logger(AuthRepo.name);

  constructor(private readonly prisma: PrismaService) {}

  public async findUserByPhone(phone: string): Promise<Account | null> {
    try {
      return await this.prisma.account.findUnique({ where: { phone } });
    } catch (error) {
      this.logger.error(`Error finding user by phone: ${error}`);
      throw error;
    }
  }

  public async findUserByEmail(email: string): Promise<Account | null> {
    return await this.prisma.account.findUnique({ where: { email } });
  }

  public async createAccount(data: AccountCreateInput): Promise<Account> {
    return await this.prisma.account.create({ data });
  }

  public async updateAccount(
    id: string,
    data: AccountUpdateInput
  ): Promise<Account> {
    return await this.prisma.account.update({ where: { id }, data });
  }
}
```

---

## 6. OTP система

### Как работает OTP

```
1. Генерация кода
   ┌─────────────────────────────────────────────────────────┐
   │  code = "123456" (6 цифр)                               │
   │  hash = SHA256(code) = "a1b2c3d4..."                    │
   │                                                         │
   │  Redis: SET otp:phone:+79991234567 "a1b2c3d4..." EX 300 │
   │         (хранится 5 минут)                              │
   └─────────────────────────────────────────────────────────┘

2. Проверка кода
   ┌─────────────────────────────────────────────────────────┐
   │  Пользователь вводит: "123456"                         │
   │  inputHash = SHA256("123456") = "a1b2c3d4..."          │
   │                                                         │
   │  Redis: GET otp:phone:+79991234567 → "a1b2c3d4..."     │
   │                                                         │
   │  inputHash === storedHash ? ✓ Успех : ✗ Ошибка         │
   │                                                         │
   │  Redis: DEL otp:phone:+79991234567 (удаляем после использования)
   └─────────────────────────────────────────────────────────┘
```

### OTP сервис

```typescript
// auth-service/src/modules/otp/otp.service.ts

type OtpType = "phone" | "email";

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private readonly redisService: RedisService) {}

  // Генерация и сохранение OTP
  public async sendOtp(
    identifier: string,
    type: OtpType
  ): Promise<{ code: string }> {
    const { code, hash } = this.generateCode();

    // Сохраняем хеш в Redis на 5 минут (300 секунд)
    await this.redisService.set(`otp:${type}:${identifier}`, hash, "EX", 300);

    this.logger.log(`OTP ${code} stored for ${type}:${identifier}`);

    return { code };
  }

  // Генерация 6-значного кода и его хеша
  private generateCode(): { code: string; hash: string } {
    // Генерируем случайное число от 100000 до 999999
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Хешируем для безопасного хранения
    const hash = crypto.createHash("sha256").update(code).digest("hex");
    return { code, hash };
  }

  // Проверка OTP
  public async verifyOtp(identifier: string, otp: string, type: OtpType) {
    // Получаем сохраненный хеш из Redis
    const storedHash = await this.redisService.get(`otp:${type}:${identifier}`);

    if (!storedHash) {
      throw new RpcException({
        code: RpcStatus.NOT_FOUND,
        message: "Invalid or expired code",
      });
    }

    // Хешируем введенный код
    const inputHash = crypto.createHash("sha256").update(otp).digest("hex");

    // Сравниваем хеши
    if (inputHash !== storedHash) {
      throw new RpcException({
        code: RpcStatus.NOT_FOUND,
        message: "Invalid or expired code",
      });
    } else {
      // Удаляем использованный код
      await this.redisService.del(`otp:${type}:${identifier}`);
    }
  }
}
```

### Redis сервис

```typescript
// auth-service/src/infra/redis/redis.service.ts

@Injectable()
export class RedisService
  extends Redis
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService<AllConfig>) {
    super({
      username: configService.get("redis.user", { infer: true }),
      password: configService.get("redis.password", { infer: true }),
      host: configService.get("redis.host", { infer: true }),
      port: configService.get("redis.port", { infer: true }),
      maxRetriesPerRequest: 5,
      enableOfflineQueue: true,
    });
  }

  public async onModuleInit(): Promise<void> {
    this.logger.log("starting redis connection");

    this.on("ready", () => {
      this.logger.log("Redis is ready");
    });

    this.on("error", (error) => {
      this.logger.error("Redis error:", error.message);
    });
  }

  public async onModuleDestroy(): Promise<void> {
    await this.quit();
    this.logger.log("Redis connection closed gracefully");
  }
}
```

---

## 7. Passport - система токенов

### Структура токена

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ТОКЕН                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  {userId}.{iat}.{exp}.{signature}                                       │
│                                                                         │
│  Пример:                                                                │
│  dXNlcklkLTEyMw.MTc2Nzc5MjgyOA.MTc2Nzc5NjQyOA.JF1S7QoEeOXURFec...     │
│                                                                         │
│  Расшифровка:                                                           │
│  - userId: "userId-123" (base64url)                                     │
│  - iat: 1767792828 (время создания, Unix timestamp)                     │
│  - exp: 1767796428 (время истечения, Unix timestamp)                    │
│  - signature: HMAC-SHA256 подпись                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### PassportService

```typescript
// passport/lib/passport.service.ts

@Injectable()
export class PassportService {
  private readonly SECRET_KEY: string;
  private static readonly HMAC_DOMAIN = "PassportTokenAuth/v1";
  private static readonly INTERNAL_SEP = "|";

  constructor(
    @Inject(PASSPORT_OPTIONS) private readonly options: PassportOptions
  ) {
    this.SECRET_KEY = options.secretKey;
  }

  // Текущее время в Unix timestamp
  private now() {
    return Math.floor(Date.now() / 1000);
  }

  // Сериализация данных для подписи
  private serialize(user: string, iat: string, exp: string) {
    // Формат: PassportTokenAuth/v1|user|iat|exp
    return [PassportService.HMAC_DOMAIN, user, iat, exp].join(
      PassportService.INTERNAL_SEP
    );
  }

  // Генерация HMAC-SHA256 подписи
  private computeHmac(secretKey: string, data: string) {
    return createHmac("sha256", secretKey).update(data).digest("base64");
  }

  // Генерация токена
  public generateToken(userId: string, ttl: number) {
    const iat = this.now(); // Время создания
    const exp = iat + ttl; // Время истечения

    // Кодируем части в base64url
    const userPart = base64UrlEncode(userId);
    const iatPart = base64UrlEncode(iat.toString());
    const expPart = base64UrlEncode(exp.toString());

    // Создаем данные для подписи
    const serializedData = this.serialize(userPart, iatPart, expPart);

    // Генерируем подпись
    const signature = this.computeHmac(this.SECRET_KEY, serializedData);

    // Собираем токен
    return `${userPart}.${iatPart}.${expPart}.${signature}`;
  }

  // Проверка токена
  public verifyToken(token: string) {
    const parts = token.split(".");

    // Проверяем формат (должно быть 4 части)
    if (parts.length !== 4) {
      return { valid: false, reason: "Invalid token format" };
    }

    const [userPart, iatPart, expPart, signature] = parts;

    // Пересчитываем подпись
    const serializedData = this.serialize(userPart, iatPart, expPart);
    const expectedSignature = this.computeHmac(this.SECRET_KEY, serializedData);

    // Сравниваем подписи (защита от timing attacks)
    if (!constantTimeEqual(expectedSignature, signature)) {
      return { valid: false, reason: "Invalid signature" };
    }

    // Проверяем срок действия
    const expNumber = Number(base64UrlDecode(expPart));
    if (!Number.isFinite(expNumber)) {
      return { valid: false, reason: "Invalid expiration time" };
    }

    if (this.now() > expNumber) {
      return { valid: false, reason: "Token expired" };
    }

    // Токен валиден
    return {
      valid: true,
      userId: base64UrlDecode(userPart),
    };
  }
}
```

### Утилиты безопасности

```typescript
// passport/lib/utils/base64.ts

// Кодирование в base64url (безопасно для URL)
export function base64UrlEncode(buffer: Buffer | string) {
  const str = typeof buffer === "string" ? Buffer.from(buffer) : buffer;
  return str
    .toString("base64")
    .replace(/\+/g, "-") // + → -
    .replace(/\//g, "_") // / → _
    .replace(/=+$/, ""); // убираем padding
}

// Декодирование из base64url
export function base64UrlDecode(str: string) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64").toString();
}
```

```typescript
// passport/lib/utils/crypto.ts

// Сравнение строк с постоянным временем (защита от timing attacks)
export function constantTimeEqual(str1: string, str2: string) {
  const buf1 = Buffer.from(str1);
  const buf2 = Buffer.from(str2);

  if (buf1.length !== buf2.length) return false;

  // timingSafeEqual выполняет сравнение за одинаковое время
  // независимо от того, где находится различие
  return timingSafeEqual(buf1, buf2);
}
```

---

## 8. Безопасность

### Защита от атак

| Атака                 | Защита                                                          |
| --------------------- | --------------------------------------------------------------- |
| **XSS**               | httpOnly cookies - JavaScript не может прочитать refresh токен  |
| **CSRF**              | sameSite: 'lax' - cookie не отправляется с cross-site запросами |
| **Timing Attack**     | constantTimeEqual - сравнение за постоянное время               |
| **Brute Force OTP**   | TTL 5 минут + удаление после использования                      |
| **Token Forgery**     | HMAC-SHA256 подпись с секретным ключом                          |
| **Man-in-the-Middle** | secure: true - cookie только через HTTPS                        |

### Хранение токенов

```
┌─────────────────────────────────────────────────────────────┐
│                    Access Token                             │
├─────────────────────────────────────────────────────────────┤
│  Где: В памяти приложения (JavaScript переменная)          │
│  TTL: Короткий (15-30 минут)                               │
│  Использование: Authorization header                        │
│  Риск: Если украден - действует недолго                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Refresh Token                             │
├─────────────────────────────────────────────────────────────┤
│  Где: httpOnly cookie                                       │
│  TTL: Длинный (30 дней)                                    │
│  Использование: Только для обновления access токена        │
│  Риск: Недоступен из JavaScript                            │
└─────────────────────────────────────────────────────────────┘
```

### Настройки Cookie

```typescript
res.cookie("refreshToken", refreshToken, {
  httpOnly: true, // ✓ Недоступен из JavaScript
  secure: true, // ✓ Только HTTPS (в продакшене)
  sameSite: "lax", // ✓ Защита от CSRF
  domain: ".example.com", // Домен для cookie
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней в миллисекундах
});
```

---

## 9. Конфигурация и валидация

### Валидация переменных окружения

```typescript
// auth-service/src/config/validators/passport.validator.ts

export class PassportValidator {
  @IsString()
  public PASSPORT_SECRET_KEY: string;

  @IsInt()
  public PASSPORT_ACCESS_TTL: number;

  @IsInt()
  public PASSPORT_REFRESH_TTL: number;
}
```

### Функция валидации

```typescript
// auth-service/src/shared/utils/env.ts

export function validateEnv<T extends object>(
  config: Record<string, string | undefined>,
  envVariablesClass: ClassConstructor<T>
) {
  // Преобразуем объект в экземпляр класса с автоконвертацией типов
  const validatedConfig = plainToInstance(envVariablesClass, config, {
    enableImplicitConversion: true,
  });

  // Валидируем
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessage = errors
      .map(
        (error) =>
          `Error in ${error.property}: ${Object.values(error.constraints).join(
            ", "
          )}`
      )
      .join("\n");

    throw new Error(`Invalid environment variables:\n${errorMessage}`);
  }

  return validatedConfig;
}
```

### Регистрация конфигурации

```typescript
// auth-service/src/config/env/passport.env.ts

export const passportEnv = registerAs<PassportConfig>("passport", () => {
  // Валидируем при загрузке
  validateEnv(process.env, PassportValidator);

  return {
    secretKey: process.env.PASSPORT_SECRET_KEY,
    accessTokenTtl: parseInt(process.env.PASSPORT_ACCESS_TTL),
    refreshTokenTtl: parseInt(process.env.PASSPORT_REFRESH_TTL),
  };
});
```

### Пример .env файла

```env
# Auth Service
PASSPORT_SECRET_KEY=super-secret-key-change-in-production
PASSPORT_ACCESS_TTL=900        # 15 минут в секундах
PASSPORT_REFRESH_TTL=2592000   # 30 дней в секундах

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USER=default
REDIS_PASSWORD=password

# gRPC
GRPC_HOST=localhost
GRPC_PORT=50051

# Gateway Service
COOKIES_SECRET=cookie-secret-key
COOKIES_DOMAIN=localhost
AUTH_GRPC_URL=localhost:50051
```

---

## 10. Примеры использования

### Отправка OTP

```bash
curl -X POST http://localhost:4000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"identifier": "+79991234567", "type": "phone"}'

# Ответ:
# {"ok": true, "code": "123456"}
```

### Проверка OTP

```bash
curl -X POST http://localhost:4000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"identifier": "+79991234567", "type": "phone", "code": "123456"}' \
  -c cookies.txt

# Ответ:
# {"accessToken": "dXNlcklkLTEyMw.MTc2Nzc5MjgyOA.MTc2Nzc5NjQyOA.JF1S7Qo..."}
# + Cookie: refreshToken (httpOnly)
```

### Использование Access Token

```bash
curl -X GET http://localhost:4000/api/protected \
  -H "Authorization: Bearer dXNlcklkLTEyMw.MTc2Nzc5MjgyOA.MTc2Nzc5NjQyOA.JF1S7Qo..."
```

### Обновление токена (TODO)

```bash
curl -X POST http://localhost:4000/auth/refresh \
  -b cookies.txt

# Ответ:
# {"accessToken": "новый-access-токен"}
```

---

## Заключение

### Что реализовано

- ✅ Микросервисная архитектура (Gateway + Auth Service)
- ✅ gRPC для связи между сервисами
- ✅ OTP авторизация через телефон/email
- ✅ Собственная система токенов (Passport)
- ✅ Безопасное хранение refresh токена в httpOnly cookie
- ✅ Валидация переменных окружения
- ✅ Обработка ошибок gRPC → HTTP

### Что нужно доделать

- ⏳ Эндпоинт обновления токена (/auth/refresh)
- ⏳ Guard для защиты роутов
- ⏳ Logout (инвалидация токенов)
- ⏳ Rate limiting для защиты от брутфорса
- ⏳ Реальная отправка SMS/Email

---
