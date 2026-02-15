# Глубокий анализ проекта - Микросервисная архитектура для системы продажи билетов в кино

## 🏗️ Общая архитектура проекта

Это **микросервисная архитектура** на базе NestJS с использованием gRPC для межсервисного взаимодействия. Проект построен по принципу разделения ответственности между сервисами.

### Структура проекта

```
backend/
├── gateway-service/      # API Gateway (HTTP REST)
├── auth-service/         # Сервис аутентификации (gRPC)
├── contracts/            # Общие gRPC контракты (Proto файлы)
├── passport/             # Библиотека для работы с токенами
├── common/               # Общие утилиты и типы
├── core/                 # Конфигурация Prettier
└── docker/               # Docker Compose для инфраструктуры
```

---

## 🎯 Основные компоненты системы

### 1. **Gateway Service** - Точка входа для клиентов

**Назначение:** HTTP REST API для фронтенда, преобразует HTTP запросы в gRPC вызовы

**Технологии:**

- NestJS + Express
- Swagger (документация API)
- Cookie-parser (работа с куками)
- gRPC клиент

**Ключевые модули:**

#### `@/modules/auth` - Модуль аутентификации

```typescript
// Эндпоинты:
POST / auth / send - otp; // Отправка OTP кода
POST / auth / verify - otp; // Проверка OTP и получение токенов
POST / auth / refresh; // Обновление токенов
POST / auth / logout; // Выход (очистка куки)
GET / auth / telegram; // Инициализация Telegram OAuth
GET / auth / account; // Получение данных (защищено)
```

**Как работает:**

1. Контроллер (`auth.controller.ts`) принимает HTTP запросы
2. `AuthGrpcClient` отправляет запрос в Auth Service через gRPC
3. Получает ответ и устанавливает `refreshToken` в httpOnly куки
4. Возвращает `accessToken` в теле ответа

#### `@/modules/account` - Модуль управления аккаунтом

```typescript
// Эндпоинты (все защищены авторизацией):
POST / account / email / init; // Инициация смены email
POST / account / email / confirm; // Подтверждение смены email
POST / account / phone / init; // Инициация смены телефона
POST / account / phone / confirm; // Подтверждение смены телефона
```

#### Система защиты маршрутов

**Guards (Охранники):**

- `AuthGuard` - проверяет JWT токен из заголовка `Authorization: Bearer <token>`
- `RolesGuard` - проверяет роль пользователя (USER/ADMIN)

**Decorators (Декораторы):**

- `@Protected()` - защита маршрута (только авторизованные)
- `@Protected('ADMIN')` - защита с проверкой роли
- `@CurrentUserId()` - извлечение userId из токена

**Пример использования:**

```typescript
@ApiBearerAuth()
@Protected('ADMIN')
@Get('account')
public async getAccount(@CurrentUserId() userId: string) {
  return { id: userId }
}
```

**Принцип SRP (Single Responsibility Principle):**
Guards и decorators находятся в Gateway, а не в библиотеке passport. Passport отвечает только за создание токена, проверку подписи, декодирование и проверку подлинности. Guard отвечает за проверку токена и возврат userId, decorator - за извлечение userId из запроса.

#### Глобальная обработка ошибок

`GlobalExceptionFilter` - перехватывает все ошибки:

- HTTP ошибки → возвращает как есть
- gRPC ошибки → преобразует в HTTP (например, gRPC код 5 → HTTP 404)
- Неизвестные ошибки → HTTP 500

**Пример обработки gRPC ошибки:**

```typescript
// gRPC ошибка: "5 NOT_FOUND: Invalid code"
// Преобразуется в: HTTP 404 с message "Invalid code"
```

---

### 2. **Auth Service** - Сервис аутентификации

**Назначение:** Обработка аутентификации через gRPC, работа с БД и Redis

**Технологии:**

- NestJS + gRPC Server
- Prisma ORM + PostgreSQL
- Redis (ioredis)
- Passport (собственная библиотека токенов)

**Модули:**

#### `@/modules/auth` - Основная логика аутентификации

**gRPC методы:**

```protobuf
service AuthService {
  rpc SendOtp(SendOtpRequest) returns (SendOtpResponse);
  rpc VerifyOtp(VerifyOtpRequest) returns (VerifyOtpResponse);
  rpc RefreshTokens(RefreshTokensRequest) returns (RefreshTokensResponse);
  rpc TelegramInit(Empty) returns (TelegramInitResponse);
  rpc TelegramVerify(TelegramVerifyRequest) returns (TelegramVerifyResponse);
}
```

**Поток SendOtp:**

1. Получает identifier (email/phone) и type
2. Проверяет существование пользователя в БД через `UserRepo`
3. Если нет - создает новый аккаунт через `AuthRepo`
4. Генерирует 6-значный OTP код через `OtpService`
5. Хеширует код (SHA-256)
6. Сохраняет хеш в Redis с TTL 300 секунд (5 минут)
7. Возвращает код (в продакшене отправляется на email/SMS)

**Поток VerifyOtp:**

1. Получает identifier, code, type
2. Достает хеш из Redis по ключу `otp:{type}:{identifier}`
3. Хеширует введенный код и сравнивает с сохраненным
4. Если совпадает - обновляет статус верификации в БД (`isPhoneVerified` или `isEmailVerified`)
5. Генерирует пару токенов (access + refresh) через `PassportService`
6. Удаляет OTP из Redis
7. Возвращает токены

**Поток RefreshTokens:**

1. Проверяет валидность refresh токена через `PassportService`
2. Извлекает userId из токена
3. Генерирует новую пару токенов
4. Возвращает новые токены

#### `@/modules/otp` - Сервис работы с OTP кодами

**Ключевые методы:**

```typescript
sendOtp(identifier, type); // Генерация и сохранение OTP
verifyOtp(identifier, code); // Проверка OTP
```

**Безопасность:**

- Коды хешируются SHA-256 перед сохранением
- TTL 5 минут (300 секунд)
- После успешной проверки код удаляется
- Используется Redis для быстрого доступа

**Формат ключа в Redis:**

```
otp:{type}:{identifier}
Пример: otp:phone:+79991234567
```

#### `@/modules/account` - Управление аккаунтами

**gRPC методы:**

```protobuf
service AccountService {
  rpc GetAccount(GetAccountRequest) returns (GetAccountResponse);
  rpc InitEmailChange(InitEmailChangeRequest) returns (InitEmailChangeResponse);
  rpc ConfirmEmailChange(ConfirmEmailChangeRequest) returns (ConfirmEmailChangeResponse);
  rpc InitPhoneChange(InitPhoneChangeRequest) returns (InitPhoneChangeResponse);
  rpc ConfirmPhoneChange(ConfirmPhoneChangeRequest) returns (ConfirmPhoneChangeResponse);
}
```

**Логика смены контактов:**

1. **Init** - проверяет уникальность нового контакта через `UserRepo`, создает запись в `PendingContactChange`
2. **Confirm** - проверяет OTP код, обновляет контакт в аккаунте, удаляет pending запись

**Важно:** Логика проверки уникальности email/phone вынесена в отдельный сервис `UserRepo` (не микросервис!), чтобы избежать дублирования кода между модулями auth и account.

#### `@/modules/telegram` - OAuth через Telegram

**Функционал:**

- Генерация URL для Telegram OAuth
- Проверка подписи данных от Telegram
- Создание/поиск пользователя по Telegram ID

**Метод `getAuthUrl()`:**

```typescript
// Генерирует URL вида:
https://oauth.telegram.org/auth?
  bot_id={BOT_ID}&
  origin={REDIRECT_ORIGIN}&
  request_access=true&
  return_to={REDIRECT_ORIGIN}/auth/telegram
```

**База данных (Prisma Schema):**

```prisma
model Account {
  id                    String   @id @default(nanoid())
  phone                 String?  @unique
  email                 String?  @unique
  isPhoneVerified       Boolean  @default(false)
  isEmailVerified       Boolean  @default(false)
  role                  Role     @default(USER)
  pendingContactChanges PendingContactChange[]
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("accounts")
}

enum Role {
  USER
  ADMIN

  @@map("roles")
}

model PendingContactChange {
  id        String   @id @default(nanoid())
  type      String   // "phone" или "email"
  value     String   // новое значение
  codeHash  String   // хеш OTP кода
  expiresAt DateTime
  account   Account  @relation(...)
  accountId String

  @@unique([accountId, type])
  @@map("pending_contact_changes")
}
```

**Роли пользователей:**

- `USER` - обычный пользователь (по умолчанию)
- `ADMIN` - администратор (может создавать сеансы, добавлять фильмы и т.п.)

---

### 3. **Contracts** - Общие gRPC контракты

**Назначение:** Единый источник истины для типов данных между сервисами

**Структура:**

```
contracts/
├── proto/
│   ├── auth.proto      # Контракты аутентификации
│   └── account.proto   # Контракты управления аккаунтом
├── gen/                # Сгенерированные TypeScript типы
└── package.json
```

**Процесс работы:**

1. Описываем API в `.proto` файлах (Protocol Buffers)
2. Запускаем `yarn generate` → генерируются TypeScript типы через ts-proto
3. Публикуем пакет в npm: `@ticket_for_cinema/contracts`
4. Все сервисы используют одни и те же типы

**Пример proto файла:**

```protobuf
syntax = "proto3";
package auth.v1;

service AuthService {
  rpc SendOtp (SendOtpRequest) returns (SendOtpResponse);
}

message SendOtpRequest {
  string identifier = 1;
  string type = 2;
}

message SendOtpResponse {
  bool ok = 1;
  string code = 2;
}
```

**Генерация типов:**

```bash
protoc -I ./proto ./proto/*.proto \
  --ts_proto_out=./gen \
  --ts_proto_opt=nestJs=true,package=omit
```

---

### 4. **Passport** - Собственная система токенов

**Назначение:** Легковесная альтернатива JWT без внешних зависимостей

**Формат токена:**

```
{userId}.{iat}.{exp}.{signature}
```

**Компоненты:**

- `userId` - ID пользователя (base64Url)
- `iat` - время создания в Unix timestamp (base64Url)
- `exp` - время истечения в Unix timestamp (base64Url)
- `signature` - HMAC-SHA256 подпись

**Ключевые методы:**

```typescript
// Генерация токена
generateToken(userId: string, ttl: number): string

// Проверка токена
verifyToken(token: string): {
  valid: boolean,
  userId?: string,
  reason?: string
}
```

**Процесс генерации:**

```typescript
// 1. Создание частей токена
const iat = Math.floor(Date.now() / 1000);
const exp = iat + ttl;
const userPart = base64UrlEncode(userId);
const iatPart = base64UrlEncode(iat.toString());
const expPart = base64UrlEncode(exp.toString());

// 2. Сериализация для подписи
const serialized = `PassportTokenAuth/v1|${userPart}|${iatPart}|${expPart}`;

// 3. Генерация HMAC подписи
const signature = createHmac("sha256", secretKey)
  .update(serialized)
  .digest("base64");

// 4. Финальный токен
return `${userPart}.${iatPart}.${expPart}.${signature}`;
```

**Безопасность:**

- HMAC-SHA256 подпись с секретным ключом - невозможно подделать
- `constantTimeEqual` - защита от timing attacks при сравнении подписей
- Base64Url кодировка - безопасно для URL
- Автоматическая проверка срока действия

**Преимущества перед JWT:**

- ✅ Полный контроль над форматом
- ✅ Нет зависимостей (только Node.js crypto)
- ✅ Простая отладка - все части читаемы
- ✅ Легко расширить дополнительными полями
- ✅ Быстрее стандартных JWT библиотек

**Динамический модуль NestJS:**

```typescript
PassportModule.registerAsync({
  useFactory: (config: ConfigService) => ({
    secretKey: config.get("PASSPORT_SECRET"),
    accessTokenTtl: config.get("ACCESS_TOKEN_TTL"),
    refreshTokenTtl: config.get("REFRESH_TOKEN_TTL"),
  }),
  inject: [ConfigService],
});
```

---

### 5. **Common** - Общие утилиты

**Назначение:** Переиспользуемые компоненты для всех сервисов

**Структура:**

```
common/lib/
├── enums/
│   └── rpc-status.enum.ts    # gRPC статус коды
└── utils/
    └── grpc-to-http-status.ts # Маппинг gRPC → HTTP
```

**RpcStatus enum:**

```typescript
export enum RpcStatus {
  OK = 0,
  CANCELLED = 1,
  UNKNOWN = 2, // аналог HTTP 500
  INVALID_ARGUMENT = 3,
  DEADLINE_EXCEEDED = 4,
  NOT_FOUND = 5, // аналог HTTP 404
  ALREADY_EXISTS = 6,
  PERMISSION_DENIED = 7,
  RESOURCE_EXHAUSTED = 8,
  FAILED_PRECONDITION = 9,
  ABORTED = 10,
  OUT_OF_RANGE = 11,
  UNIMPLEMENTED = 12,
  INTERNAL = 13,
  UNAVAILABLE = 14,
  DATA_LOSS = 15,
  UNAUTHENTICATED = 16, // аналог HTTP 401
}
```

**Маппинг gRPC → HTTP:**

```typescript
const grpcStatusToHttpStatus = {
  0: 200, // OK
  5: 404, // NOT_FOUND
  7: 403, // PERMISSION_DENIED
  16: 401, // UNAUTHENTICATED
  // ...
};
```

---

### 6. **Core** - Конфигурация форматирования

**Назначение:** Единая конфигурация Prettier для всех сервисов

**Использование в package.json:**

```json
{
  "prettier": "@ticket_for_cinema/core/prettier"
}
```

**Плагины:**

- `@trivago/prettier-plugin-sort-imports` - автоматическая сортировка импортов

---

## 🔄 Полный поток аутентификации

### 1. Регистрация/Вход через OTP

```
┌─────────┐         ┌─────────┐         ┌──────────┐         ┌──────┐         ┌──────────┐
│ Клиент  │         │ Gateway │         │   Auth   │         │Redis │         │PostgreSQL│
└────┬────┘         └────┬────┘         └────┬─────┘         └──┬───┘         └────┬─────┘
     │                   │                   │                   │                  │
     │ POST /auth/send-otp                   │                   │                  │
     │ {phone, type}     │                   │                   │                  │
     ├──────────────────►│                   │                   │                  │
     │                   │ gRPC SendOtp      │                   │                  │
     │                   ├──────────────────►│                   │                  │
     │                   │                   │ Поиск user        │                  │
     │                   │                   ├──────────────────────────────────────►│
     │                   │                   │ Account | null    │                  │
     │                   │                   │◄──────────────────────────────────────┤
     │                   │                   │ Создание (если нет)                   │
     │                   │                   ├──────────────────────────────────────►│
     │                   │                   │ Генерация OTP     │                  │
     │                   │                   │ (123456)          │                  │
     │                   │                   │ Хеширование SHA256│                  │
     │                   │                   ├──────────────────►│                  │
     │                   │                   │ SET otp:phone:... │                  │
     │                   │                   │ EX 300            │                  │
     │                   │ {ok, code}        │                   │                  │
     │                   │◄──────────────────┤                   │                  │
     │ {ok, code}        │                   │                   │                  │
     │◄──────────────────┤                   │                   │                  │
     │                   │                   │                   │                  │
     │ POST /auth/verify-otp                 │                   │                  │
     │ {phone, code}     │                   │                   │                  │
     ├──────────────────►│                   │                   │                  │
     │                   │ gRPC VerifyOtp    │                   │                  │
     │                   ├──────────────────►│                   │                  │
     │                   │                   │ GET otp:phone:... │                  │
     │                   │                   ├──────────────────►│                  │
     │                   │                   │ hash              │                  │
     │                   │                   │◄──────────────────┤                  │
     │                   │                   │ Сравнение хешей   │                  │
     │                   │                   │ Обновление статуса│                  │
     │                   │                   ├──────────────────────────────────────►│
     │                   │                   │ UPDATE isPhoneVerified = true         │
     │                   │                   │ Генерация токенов │                  │
     │                   │                   │ (Passport)        │                  │
     │                   │ {access, refresh} │                   │                  │
     │                   │◄──────────────────┤                   │                  │
     │                   │ Set-Cookie:       │                   │                  │
     │                   │ refreshToken      │                   │                  │
     │                   │ (httpOnly)        │                   │                  │
     │ {accessToken}     │                   │                   │                  │
     │◄──────────────────┤                   │                   │                  │
```

### 2. Защищенный запрос

```
┌─────────┐         ┌─────────┐
│ Клиент  │         │ Gateway │
└────┬────┘         └────┬────┘
     │                   │
     │ GET /auth/account │
     │ Authorization:    │
     │ Bearer <token>    │
     ├──────────────────►│
     │                   │ AuthGuard
     │                   │ ├─ Извлечение токена из заголовка
     │                   │ ├─ Проверка формата (4 части)
     │                   │ ├─ Проверка подписи HMAC
     │                   │ ├─ Проверка срока действия
     │                   │ └─ Извлечение userId
     │                   │ request.user = { id: userId }
     │                   │
     │                   │ RolesGuard (если @Protected('ADMIN'))
     │                   │ └─ Проверка роли из БД
     │                   │
     │ {id: "userId"}    │
     │◄──────────────────┤
```

### 3. Обновление токенов

```
┌─────────┐         ┌─────────┐         ┌──────────┐
│ Клиент  │         │ Gateway │         │   Auth   │
└────┬────┘         └────┬────┘         └────┬─────┘
     │                   │                   │
     │ POST /auth/refresh│                   │
     │ Cookie:           │                   │
     │ refreshToken=...  │                   │
     ├──────────────────►│                   │
     │                   │ Извлечение из куки│
     │                   │ gRPC RefreshTokens│
     │                   ├──────────────────►│
     │                   │                   │ Проверка токена
     │                   │                   │ (подпись, срок)
     │                   │                   │ Генерация новых
     │                   │ {access, refresh} │
     │                   │◄──────────────────┤
     │                   │ Set-Cookie:       │
     │                   │ новый refresh     │
     │ {accessToken}     │                   │
     │◄──────────────────┤                   │
```

### 4. Logout (Выход)

```
┌─────────┐         ┌─────────┐
│ Клиент  │         │ Gateway │
└────┬────┘         └────┬────┘
     │                   │
     │ POST /auth/logout │
     ├──────────────────►│
     │                   │ Set-Cookie:
     │                   │ refreshToken=""
     │                   │ expires=new Date(0)
     │ {ok: true}        │
     │◄──────────────────┤
```

### 5. Смена контактов (Email/Phone)

```
┌─────────┐         ┌─────────┐         ┌──────────┐         ┌──────┐
│ Клиент  │         │ Gateway │         │   Auth   │         │Redis │
└────┬────┘         └────┬────┘         └────┬─────┘         └──┬───┘
     │                   │                   │                   │
     │ POST /account/email/init              │                   │
     │ {email: "new@mail.com"}               │                   │
     │ Authorization: Bearer <token>         │                   │
     ├──────────────────►│                   │                   │
     │                   │ AuthGuard         │                   │
     │                   │ (извлечение userId)                   │
     │                   │ gRPC InitEmailChange                  │
     │                   ├──────────────────►│                   │
     │                   │                   │ Проверка уникальности
     │                   │                   │ Создание PendingContactChange
     │                   │                   │ Генерация OTP     │
     │                   │                   ├──────────────────►│
     │                   │ {ok: true}        │                   │
     │                   │◄──────────────────┤                   │
     │ {ok: true}        │                   │                   │
     │◄──────────────────┤                   │                   │
     │                   │                   │                   │
     │ POST /account/email/confirm           │                   │
     │ {email, code}     │                   │                   │
     ├──────────────────►│                   │                   │
     │                   │ gRPC ConfirmEmailChange               │
     │                   ├──────────────────►│                   │
     │                   │                   │ Проверка OTP      │
     │                   │                   │ Обновление email  │
     │                   │                   │ Удаление pending  │
     │                   │ {ok: true}        │                   │
     │                   │◄──────────────────┤                   │
     │ {ok: true}        │                   │                   │
     │◄──────────────────┤                   │                   │
```

---

## 🔐 Безопасность

### Защита токенов

**Access Token:**

- Хранится в памяти клиента (переменная JavaScript)
- **НЕ хранится в localStorage** (уязвимость к XSS)
- Короткий TTL (обычно 15 минут)
- Передается в заголовке `Authorization: Bearer <token>`
- При обновлении страницы теряется → используется refresh

**Refresh Token:**

- Хранится в httpOnly куки
- Длинный TTL (30 дней)
- Защищен от XSS атак (JavaScript не может прочитать)
- Автоматически отправляется браузером при запросах

### Настройки куки (Cookie Security)

```typescript
res.cookie("refreshToken", refreshToken, {
  httpOnly: true, // Защита от XSS - JS не может прочитать
  secure: true, // Только HTTPS (в production)
  sameSite: "lax", // Защита от CSRF
  domain: "example.com", // Ограничение домена
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
});
```

### Защита от атак

**1. XSS (Cross-Site Scripting)**

- `httpOnly` куки - JavaScript не может прочитать refresh token
- Валидация входных данных через `class-validator`
- Санитизация данных

**2. CSRF (Cross-Site Request Forgery)**

- `sameSite: 'lax'` - куки не отправляются с других сайтов
- Проверка origin заголовков

**3. Timing Attacks**

- `constantTimeEqual` при сравнении подписей токенов
- Предотвращает определение правильности подписи по времени выполнения

**4. Brute Force**

- TTL на OTP коды (5 минут)
- Одноразовые коды (удаляются после использования)
- Rate limiting (можно добавить)

**5. Replay Attacks**

- Одноразовые OTP коды
- Проверка срока действия токенов

**6. Man-in-the-Middle**

- HTTPS в production (`secure: true`)
- Подпись токенов HMAC-SHA256

---

## 🐳 Инфраструктура (Docker)

```yaml
services:
  postgres:
    image: postgres:15
    ports: ["5433:5432"]
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - ticket_for_cinema

  redis:
    image: redis:6.2
    ports: ["6379:6379"]
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - ticket_for_cinema
```

**Запуск:**

```bash
cd docker
docker-compose up -d
```

**Проверка:**

```bash
docker-compose ps
docker-compose logs -f
```

---

## 📦 NPM пакеты проекта

Все внутренние пакеты публикуются в npm под scope `@ticket_for_cinema`:

### 1. **@ticket_for_cinema/core** (v1.0.6)

- Prettier конфигурация
- Плагин сортировки импортов

### 2. **@ticket_for_cinema/common** (v1.0.1)

- Общие утилиты
- RpcStatus enum
- Маппинг gRPC → HTTP статусов

### 3. **@ticket_for_cinema/contracts** (v1.0.23)

- gRPC контракты (proto файлы)
- Сгенерированные TypeScript типы
- Используется всеми сервисами

### 4. **@ticket_for_cinema/passport** (v1.0.0)

- Собственная система токенов
- Динамический NestJS модуль
- HMAC-SHA256 подпись

---

## 🎨 Паттерны проектирования

### 1. **Repository Pattern**

Отделение логики работы с БД от бизнес-логики

```typescript
@Injectable()
export class AuthRepo {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByPhone(phone: string): Promise<Account | null> {
    return this.prisma.account.findUnique({ where: { phone } });
  }

  async createAccount(data: CreateAccountDto): Promise<Account> {
    return this.prisma.account.create({ data });
  }
}
```

**Преимущества:**

- Легко сменить ORM (Prisma → TypeORM)
- Тестирование через моки
- Единая точка работы с БД

### 2. **Dependency Injection**

NestJS автоматически управляет зависимостями

```typescript
@Injectable()
export class AuthService {
  constructor(
    private readonly authRepo: AuthRepo,
    private readonly otpService: OtpService,
    private readonly passportService: PassportService,
  ) {}
}
```

### 3. **Module Pattern**

Каждая функциональность - отдельный модуль

```typescript
@Module({
  imports: [PrismaModule, RedisModule, OtpModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRepo],
})
export class AuthModule {}
```

### 4. **DTO Pattern**

Валидация и трансформация данных

```typescript
export class SendOtpRequest {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsIn(["phone", "email"])
  type: string;
}
```

### 5. **Guard Pattern**

Защита маршрутов через декораторы

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    const result = this.passportService.verifyToken(token);

    if (!result.valid) throw new UnauthorizedException();
    request.user = { id: result.userId };
    return true;
  }
}
```

### 6. **Filter Pattern**

Централизованная обработка ошибок

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    // Преобразование gRPC → HTTP
    // Логирование
    // Форматирование ответа
  }
}
```

### 7. **Factory Pattern**

Динамическое создание модулей

```typescript
PassportModule.registerAsync({
  useFactory: (config: ConfigService) => ({
    secretKey: config.get("PASSPORT_SECRET"),
  }),
  inject: [ConfigService],
});
```

---

## 🚀 Как это работает в целом

### Полный цикл запроса:

1. **Клиент** отправляет HTTP запрос на **Gateway** (например, `POST /auth/send-otp`)

2. **Gateway** валидирует данные через DTO с помощью `class-validator`

3. **Gateway** вызывает нужный метод в **Auth Service** через gRPC
   - Использует типы из `@ticket_for_cinema/contracts`
   - gRPC клиент преобразует данные в Protocol Buffers

4. **Auth Service** обрабатывает запрос:
   - Работает с PostgreSQL через Prisma
   - Работает с Redis через ioredis
   - Использует `PassportService` для токенов

5. **Auth Service** возвращает ответ через gRPC

6. **Gateway** преобразует ответ в HTTP:
   - Устанавливает куки (если нужно)
   - Форматирует JSON ответ

7. При ошибках **GlobalExceptionFilter** преобразует их:
   - gRPC ошибки → HTTP статусы
   - Логирует ошибки
   - Возвращает понятный JSON

### Пример полного цикла:

```
Клиент → Gateway → gRPC → Auth Service → Prisma → PostgreSQL
                                       → Redis
                                       ← Ответ
        ← HTTP ← gRPC ← Auth Service
```

---

## 📝 Конфигурация окружения

### Gateway Service (.env)

```env
# HTTP Server
HTTP_PORT=3000
HTTP_HOST=http://localhost:3000

# Cookies
COOKIES_SECRET=your-secret-key
COOKIES_DOMAIN=localhost

# gRPC Client
GRPC_AUTH_URL=localhost:50051
GRPC_ACCOUNT_URL=localhost:50051

# Passport
PASSPORT_SECRET=your-passport-secret
ACCESS_TOKEN_TTL=900        # 15 минут
REFRESH_TOKEN_TTL=2592000   # 30 дней

# Environment
NODE_ENV=development
```

### Auth Service (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5433/cinema

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# gRPC Server
GRPC_HOST=0.0.0.0
GRPC_PORT=50051

# Passport
PASSPORT_SECRET=your-passport-secret
ACCESS_TOKEN_TTL=900
REFRESH_TOKEN_TTL=2592000

# Telegram OAuth
TELEGRAM_BOT_ID=your-bot-id
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_BOT_USERNAME=your-bot-username
TELEGRAM_REDIRECT_ORIGIN=http://localhost:3000
```

---

## 🔧 Команды для разработки

### Gateway Service

```bash
# Установка зависимостей
yarn install

# Разработка
yarn start:dev

# Продакшен
yarn build
yarn start:prod

# Форматирование
yarn format
```

### Auth Service

```bash
# Установка зависимостей
yarn install

# Prisma миграции
npx prisma migrate dev
npx prisma generate

# Разработка
yarn start:dev

# Продакшен
yarn build
yarn start:prod
```

### Contracts

```bash
# Генерация TypeScript из proto
yarn generate

# Сборка
yarn build

# Публикация в npm
npm publish
```

---

## 📊 Диаграмма архитектуры

```
                                    ┌─────────────────────────────┐
                                    │      Клиент (Browser)       │
                                    │   - React/Vue/Angular       │
                                    └──────────────┬──────────────┘
                                                   │ HTTP/HTTPS
                                                   │
                    ┌──────────────────────────────▼──────────────────────────────┐
                    │                    Gateway Service                          │
                    │                   (NestJS + Express)                        │
                    │  ┌────────────────────────────────────────────────────┐    │
                    │  │  Controllers (HTTP REST API)                       │    │
                    │  │  - AuthController                                  │    │
                    │  │  - AccountController                               │    │
                    │  └────────────────────────────────────────────────────┘    │
                    │  ┌────────────────────────────────────────────────────┐    │
                    │  │  Guards & Decorators                               │    │
                    │  │  - AuthGuard (проверка токена)                     │    │
                    │  │  - RolesGuard (проверка роли)                      │    │
                    │  │  - @Protected() @CurrentUserId()                   │    │
                    │  └────────────────────────────────────────────────────┘    │
                    │  ┌────────────────────────────────────────────────────┐    │
                    │  │  gRPC Clients                                      │    │
                    │  │  - AuthGrpcClient                                  │    │
                    │  │  - AccountGrpcClient                               │    │
                    │  └────────────────────────────────────────────────────┘    │
                    │  ┌────────────────────────────────────────────────────┐    │
                    │  │  Global Exception Filter                           │    │
                    │  │  (gRPC → HTTP error mapping)                       │    │
                    │  └────────────────────────────────────────────────────┘    │
                    └──────────────────────────────┬──────────────────────────────┘
                                                   │ gRPC
                                                   │
                    ┌──────────────────────────────▼──────────────────────────────┐
                    │                    Auth Service                             │
                    │                   (NestJS + gRPC)                           │
                    │  ┌────────────────────────────────────────────────────┐    │
                    │  │  gRPC Controllers                                  │    │
                    │  │  - AuthController (@GrpcMethod)                    │    │
                    │  │  - AccountController (@GrpcMethod)                 │    │
                    │  └────────────────────────────────────────────────────┘    │
                    │  ┌────────────────────────────────────────────────────┐    │
                    │  │  Services (Business Logic)                         │    │
                    │  │  - AuthService                                     │    │
                    │  │  - AccountService                                  │    │
                    │  │  - OtpService                                      │    │
                    │  │  - TelegramService                                 │    │
                    │  └────────────────────────────────────────────────────┘    │
                    │  ┌────────────────────────────────────────────────────┐    │
                    │  │  Repositories (Data Access)                        │    │
                    │  │  - AuthRepo                                        │    │
                    │  │  - UserRepo                                        │    │
                    │  └────────────────────────────────────────────────────┘    │
                    └─────────────┬──────────────────────┬─────────────────────────┘
                                  │                      │
                    ┌─────────────▼──────────┐  ┌────────▼──────────┐
                    │      PostgreSQL        │  │       Redis       │
                    │   (Prisma ORM)         │  │   (ioredis)       │
                    │                        │  │                   │
                    │  - accounts            │  │  - OTP codes      │
                    │  - pending_changes     │  │  - TTL 5 min      │
                    └────────────────────────┘  └───────────────────┘

                    ┌─────────────────────────────────────────────────────────┐
                    │              Shared Libraries (npm)                     │
                    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
                    │  │  @contracts  │  │  @passport   │  │   @common    │ │
                    │  │  (gRPC types)│  │  (Tokens)    │  │  (Utilities) │ │
                    │  └──────────────┘  └──────────────┘  └──────────────┘ │
                    └─────────────────────────────────────────────────────────┘
```

---

## ✅ Итоговые выводы

Это **масштабируемая**, **безопасная** и **поддерживаемая** микросервисная архитектура со следующими ключевыми особенностями:

### Преимущества архитектуры:

1. **Разделение ответственности** - каждый сервис отвечает за свою область
2. **Независимое развертывание** - сервисы можно деплоить отдельно
3. **Масштабируемость** - можно масштабировать отдельные сервисы
4. **Типобезопасность** - общие контракты через Protocol Buffers
5. **Безопасность** - многоуровневая защита токенов и данных
6. **Производительность** - gRPC быстрее REST, Redis для кеширования
7. **Поддерживаемость** - четкая структура, паттерны, документация

### Технологический стек:

- **Backend Framework:** NestJS
- **Communication:** gRPC + Protocol Buffers
- **Database:** PostgreSQL + Prisma ORM
- **Cache:** Redis
- **Authentication:** Custom Passport (HMAC-SHA256)
- **Validation:** class-validator + class-transformer
- **Documentation:** Swagger/OpenAPI
- **Infrastructure:** Docker Compose

### Реализованный функционал:

✅ Аутентификация через OTP (email/phone)  
✅ Авторизация через Telegram OAuth  
✅ Система токенов (access + refresh)  
✅ Защита маршрутов (Guards + Decorators)  
✅ Управление ролями (USER/ADMIN)  
✅ Смена контактов (email/phone)  
✅ Глобальная обработка ошибок  
✅ Безопасное хранение токенов (httpOnly cookies)  
✅ Docker инфраструктура

Проект готов к продакшену и дальнейшему расширению! 🎬🚀

---

## 🔄 Детальный процесс изменения контактных данных (Email/Phone)

### Общая схема процесса

Изменение контактов происходит в **два этапа**:

1. **Init (Инициация)** - пользователь указывает новый контакт, система отправляет OTP код
2. **Confirm (Подтверждение)** - пользователь вводит код, система обновляет данные

---

### Полная диаграмма процесса изменения Email

```
┌─────────┐         ┌─────────┐         ┌──────────┐         ┌──────┐         ┌──────────┐
│ Клиент  │         │ Gateway │         │   Auth   │         │Redis │         │PostgreSQL│
└────┬────┘         └────┬────┘         └────┬─────┘         └──┬───┘         └────┬─────┘
     │                   │                   │                   │                  │
     │ ════════════════ ЭТАП 1: ИНИЦИАЦИЯ ═══════════════════════════════════════════
     │                   │                   │                   │                  │
     │ POST /account/email/init              │                   │                  │
     │ {email: "new@mail.com"}               │                   │                  │
     │ Authorization: Bearer <access_token>  │                   │                  │
     ├──────────────────►│                   │                   │                  │
     │                   │ AuthGuard         │                   │                  │
     │                   │ (извлечение userId из токена)         │                  │
     │                   │                   │                   │                  │
     │                   │ gRPC InitEmailChange                  │                  │
     │                   │ {email, userId}   │                   │                  │
     │                   ├──────────────────►│                   │                  │
     │                   │                   │ 1. Проверка уникальности             │
     │                   │                   │ UserRepo.findUserByEmail()            │
     │                   │                   ├──────────────────────────────────────►│
     │                   │                   │ SELECT * FROM accounts                │
     │                   │                   │ WHERE email = 'new@mail.com'          │
     │                   │                   │◄──────────────────────────────────────┤
     │                   │                   │ null (email свободен)                 │
     │                   │                   │                   │                  │
     │                   │                   │ 2. Генерация OTP  │                  │
     │                   │                   │ OtpService.sendOtp(email, "email")    │
     │                   │                   │ - Генерация 6-значного кода (123456)  │
     │                   │                   │ - Хеширование SHA-256                 │
     │                   │                   ├──────────────────►│                  │
     │                   │                   │ SET otp:email:new@mail.com hash       │
     │                   │                   │ EX 300 (5 минут)  │                  │
     │                   │                   │                   │                  │
     │                   │                   │ 3. Создание PendingContactChange      │
     │                   │                   │ AccountRepo.usertPendingChange()      │
     │                   │                   ├──────────────────────────────────────►│
     │                   │                   │ INSERT INTO pending_contact_changes   │
     │                   │                   │ (accountId, type, value, codeHash,    │
     │                   │                   │  expiresAt)                           │
     │                   │                   │ VALUES (userId, 'email',              │
     │                   │                   │  'new@mail.com', hash, now()+5min)    │
     │                   │                   │◄──────────────────────────────────────┤
     │                   │                   │                   │                  │
     │                   │ {ok: true}        │                   │                  │
     │                   │◄──────────────────┤                   │                  │
     │ {ok: true}        │                   │                   │                  │
     │◄──────────────────┤                   │                   │                  │
     │                   │                   │                   │                  │
     │ (Пользователь получает код на new@mail.com)              │                  │
     │                   │                   │                   │                  │
     │ ════════════════ ЭТАП 2: ПОДТВЕРЖДЕНИЕ ════════════════════════════════════════
     │                   │                   │                   │                  │
     │ POST /account/email/confirm           │                   │                  │
     │ {email: "new@mail.com", code: "123456"}                   │                  │
     │ Authorization: Bearer <access_token>  │                   │                  │
     ├──────────────────►│                   │                   │                  │
     │                   │ AuthGuard         │                   │                  │
     │                   │ (извлечение userId)                   │                  │
     │                   │                   │                   │                  │
     │                   │ gRPC ConfirmEmailChange               │                  │
     │                   │ {email, code, userId}                 │                  │
     │                   ├──────────────────►│                   │                  │
     │                   │                   │ 1. Поиск pending записи               │
     │                   │                   │ AccountRepo.findPendingChange()       │
     │                   │                   ├──────────────────────────────────────►│
     │                   │                   │ SELECT * FROM pending_contact_changes │
     │                   │                   │ WHERE accountId = userId              │
     │                   │                   │ AND type = 'email'                    │
     │                   │                   │◄──────────────────────────────────────┤
     │                   │                   │ {value, codeHash, expiresAt}          │
     │                   │                   │                   │                  │
     │                   │                   │ 2. Валидация      │                  │
     │                   │                   │ - pending.value === email ✓           │
     │                   │                   │ - pending.expiresAt > now() ✓         │
     │                   │                   │                   │                  │
     │                   │                   │ 3. Проверка OTP кода                  │
     │                   │                   │ OtpService.verifyOtp(email, code)     │
     │                   │                   ├──────────────────►│                  │
     │                   │                   │ GET otp:email:new@mail.com            │
     │                   │                   │◄──────────────────┤                  │
     │                   │                   │ storedHash        │                  │
     │                   │                   │ SHA256(code) === storedHash ✓         │
     │                   │                   ├──────────────────►│                  │
     │                   │                   │ DEL otp:email:new@mail.com            │
     │                   │                   │                   │                  │
     │                   │                   │ 4. Обновление аккаунта                │
     │                   │                   │ UserRepo.updateAccount()              │
     │                   │                   ├──────────────────────────────────────►│
     │                   │                   │ UPDATE accounts                       │
     │                   │                   │ SET email = 'new@mail.com',           │
     │                   │                   │     isEmailVerified = true            │
     │                   │                   │ WHERE id = userId                     │
     │                   │                   │◄──────────────────────────────────────┤
     │                   │                   │                   │                  │
     │                   │                   │ 5. Удаление pending записи            │
     │                   │                   │ AccountRepo.deletePandingChange()     │
     │                   │                   ├──────────────────────────────────────►│
     │                   │                   │ DELETE FROM pending_contact_changes   │
     │                   │                   │ WHERE accountId = userId              │
     │                   │                   │ AND type = 'email'                    │
     │                   │                   │◄──────────────────────────────────────┤
     │                   │                   │                   │                  │
     │                   │ {ok: true}        │                   │                  │
     │                   │◄──────────────────┤                   │                  │
     │ {ok: true}        │                   │                   │                  │
     │◄──────────────────┤                   │                   │                  │
     │                   │                   │                   │                  │
     │ ✅ Email успешно изменен!             │                   │                  │
```

---

### ЭТАП 1: Инициация изменения (Init)

#### 1.1. HTTP запрос от клиента

```typescript
POST / account / email / init;
Headers: {
  Authorization: "Bearer <access_token>";
}
Body: {
  email: "new@mail.com";
}
```

#### 1.2. Gateway обработка

```typescript
// gateway-service/src/modules/account/account.controller.ts

@Protected()  // Проверка авторизации через AuthGuard
@Post('email/init')
public async initEmailChange(
  @Body() dto: InitEmailChangeDto,
  @CurrentUserId() userId: string  // Извлекается из токена
) {
  return this.accountGrpcClient.initEmailChange({
    email: dto.email,
    userId
  })
}
```

**Что происходит:**

- `@Protected()` активирует `AuthGuard`
- `AuthGuard` проверяет токен и извлекает `userId`
- `@CurrentUserId()` получает `userId` из `request.user.id`
- Данные отправляются в Auth Service через gRPC

#### 1.3. Auth Service обработка

```typescript
// auth-service/src/modules/account/account.service.ts

public async initEmailChange(data: InitEmailChangeRequest) {
  const { email, userId } = data;

  // ШАГ 1: Проверка уникальности email
  const existingUser = await this.userRepo.findUserByEmail(email);
  if (existingUser) {
    throw new RpcException({
      code: RpcStatus.INVALID_ARGUMENT,
      details: "User with this email already exists"
    });
  }

  // ШАГ 2: Генерация OTP кода
  const { code, hash } = await this.otpService.sendOtp(
    email,
    "email" as OtpType
  );

  console.log("code", code); // В продакшене отправляется на email

  // ШАГ 3: Создание pending записи в БД
  await this.accountRepo.usertPendingChange({
    accountId: userId,
    type: "email",
    value: email,
    codeHash: hash,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 минут
  });

  return { ok: true };
}
```

**Важные моменты:**

1. **Проверка уникальности** - предотвращает дублирование email
2. **OTP генерация** - создается 6-значный код и хешируется SHA-256
3. **PendingContactChange** - временная запись в БД с информацией о предстоящем изменении
4. **TTL 5 минут** - код действителен только 5 минут

---

### ЭТАП 2: Подтверждение изменения (Confirm)

#### 2.1. HTTP запрос от клиента

```typescript
POST /account/email/confirm
Headers: {
  Authorization: "Bearer <access_token>"
}
Body: {
  email: "new@mail.com",
  code: "123456"
}
```

#### 2.2. Gateway обработка

```typescript
@Protected()
@Post('email/confirm')
public async confirmEmailChange(
  @Body() dto: ConfirmEmailChangeDto,
  @CurrentUserId() userId: string
) {
  return this.accountGrpcClient.confirmEmailChange({
    email: dto.email,
    code: dto.code,
    userId
  })
}
```

#### 2.3. Auth Service обработка

```typescript
public async confirmEmailChange(
  data: ConfirmEmailChangeRequest
): Promise<ConfirmEmailChangeResponse> {
  const { email, userId, code } = data;

  // ШАГ 1: Поиск pending записи
  const pending = await this.accountRepo.findPendingChange(userId, "email");

  if (!pending) {
    throw new RpcException({
      code: RpcStatus.NOT_FOUND,
      details: "Pending change not found"
    });
  }

  // ШАГ 2: Проверка соответствия email
  if (pending.value !== email) {
    throw new RpcException({
      code: RpcStatus.INVALID_ARGUMENT,
      details: "Missmatched email"
    });
  }

  // ШАГ 3: Проверка срока действия
  if (pending.expiresAt < new Date()) {
    throw new RpcException({
      code: RpcStatus.NOT_FOUND,
      details: "Pending change expired"
    });
  }

  // ШАГ 4: Проверка OTP кода
  await this.otpService.verifyOtp(pending.value, code, "email");

  // ШАГ 5: Обновление аккаунта
  await this.userRepo.updateAccount(userId, {
    email,
    isEmailVerified: true
  });

  // ШАГ 6: Удаление pending записи
  await this.accountRepo.deletePandingChange({
    accountId: userId,
    type: "email"
  });

  return { ok: true };
}
```

**Процесс валидации:**

1. Проверка существования pending записи
2. Проверка соответствия email
3. Проверка срока действия (не истек ли)
4. Проверка OTP кода через Redis
5. Атомарное обновление данных
6. Очистка временных данных

---

### Система безопасности при изменении контактов

#### 1. **Защита от несанкционированного доступа**

- Требуется валидный `access_token`
- `AuthGuard` проверяет подпись токена
- Изменить можно только свои данные (userId из токена)

#### 2. **Защита от дублирования**

- Проверка уникальности email/phone перед отправкой OTP
- Предотвращает конфликты в БД
- Используется `UserRepo.findUserByEmail()` / `UserRepo.findUserByPhone()`

#### 3. **Временное хранилище (PendingContactChange)**

- Изменения не применяются сразу
- Требуется подтверждение через OTP
- Автоматическое истечение через 5 минут
- `UNIQUE(account_id, type)` - один pending на тип контакта

#### 4. **OTP безопасность**

- Коды хешируются SHA-256
- Хранятся в Redis с TTL 300 секунд
- Удаляются после использования
- Защита от brute force (ограниченное время)

#### 5. **Валидация на каждом этапе**

- Проверка существования pending записи
- Проверка соответствия email/phone
- Проверка срока действия
- Проверка OTP кода

---

### Структура данных

#### PendingContactChange (PostgreSQL)

```sql
CREATE TABLE pending_contact_changes (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,           -- "phone" или "email"
  value       TEXT NOT NULL,           -- новое значение
  code_hash   TEXT NOT NULL,           -- хеш OTP кода
  expires_at  TIMESTAMP NOT NULL,      -- когда истекает
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW(),

  UNIQUE(account_id, type)  -- один pending на тип контакта
);
```

**Важно:** `UNIQUE(account_id, type)` - пользователь не может одновременно менять один и тот же тип контакта несколько раз.

#### OTP в Redis

```
Ключ: otp:email:new@mail.com
Значение: <SHA256 хеш кода>
TTL: 300 секунд (5 минут)
```

---

### Аналогичный процесс для телефона

Процесс изменения телефона **идентичен** изменению email:

```typescript
// Инициация
POST /account/phone/init
Body: { phone: "+79991234567" }

// Подтверждение
POST /account/phone/confirm
Body: { phone: "+79991234567", code: "123456" }
```

**Единственные отличия:**

- `type: "phone"` вместо `type: "email"`
- Обновляется поле `phone` и `isPhoneVerified`
- OTP ключ: `otp:phone:+79991234567`

**Код в AccountService:**

```typescript
public async initPhoneChange(data: InitPhoneChangeRequest) {
  const { phone, userId } = data;

  const existingUser = await this.userRepo.findUserByPhone(phone);
  if (existingUser) {
    throw new RpcException({
      code: RpcStatus.INVALID_ARGUMENT,
      details: "User with this phone already exists"
    });
  }

  const { code, hash } = await this.otpService.sendOtp(
    phone,
    "phone" as OtpType
  );

  await this.accountRepo.usertPendingChange({
    accountId: userId,
    type: "phone",
    value: phone,
    codeHash: hash,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000)
  });

  return { ok: true };
}

public async confirmPhoneChange(
  data: ConfirmPhoneChangeRequest
): Promise<ConfirmPhoneChangeResponse> {
  const { phone, userId, code } = data;

  const pending = await this.accountRepo.findPendingChange(userId, "phone");

  if (!pending) {
    throw new RpcException({
      code: RpcStatus.NOT_FOUND,
      details: "Pending change not found"
    });
  }

  if (pending.value !== phone) {
    throw new RpcException({
      code: RpcStatus.INVALID_ARGUMENT,
      details: "Missmatched phone"
    });
  }

  if (pending.expiresAt < new Date()) {
    throw new RpcException({
      code: RpcStatus.NOT_FOUND,
      details: "Pending change expired"
    });
  }

  await this.otpService.verifyOtp(pending.value, code, "phone");

  await this.userRepo.updateAccount(userId, {
    phone,
    isPhoneVerified: true
  });

  await this.accountRepo.deletePandingChange({
    accountId: userId,
    type: "phone"
  });

  return { ok: true };
}
```

---

### Обработка ошибок

#### Возможные ошибки на этапе Init:

| Ошибка                                | gRPC Код           | HTTP Код | Причина           |
| ------------------------------------- | ------------------ | -------- | ----------------- |
| `User with this email already exists` | `INVALID_ARGUMENT` | 400      | Email уже занят   |
| `User with this phone already exists` | `INVALID_ARGUMENT` | 400      | Телефон уже занят |
| `Unauthorized`                        | `UNAUTHENTICATED`  | 401      | Невалидный токен  |

#### Возможные ошибки на этапе Confirm:

| Ошибка                     | gRPC Код           | HTTP Код | Причина                             |
| -------------------------- | ------------------ | -------- | ----------------------------------- |
| `Pending change not found` | `NOT_FOUND`        | 404      | Нет pending записи (не вызван Init) |
| `Missmatched email/phone`  | `INVALID_ARGUMENT` | 400      | Email/phone не совпадает с pending  |
| `Pending change expired`   | `NOT_FOUND`        | 404      | Истек срок действия (>5 минут)      |
| `Invalid or expired code`  | `NOT_FOUND`        | 404      | Неверный OTP код                    |
| `Unauthorized`             | `UNAUTHENTICATED`  | 401      | Невалидный токен                    |

---

### Ключевые особенности реализации

#### 1. **Разделение ответственности (SRP)**

- `UserRepo` - проверка уникальности (используется и в auth, и в account)
- `OtpService` - работа с OTP кодами
- `AccountRepo` - работа с pending изменениями
- `AccountService` - бизнес-логика

#### 2. **Избежание дублирования кода**

Логика проверки уникальности вынесена в `UserRepo`, который используется в обоих модулях:

- `AuthModule` - при регистрации через OTP
- `AccountModule` - при смене контактов

```typescript
// shared/repositories/user.repo.ts
@Injectable()
export class UserRepo {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string): Promise<Account | null> {
    return this.prisma.account.findUnique({ where: { email } });
  }

  async findUserByPhone(phone: string): Promise<Account | null> {
    return this.prisma.account.findUnique({ where: { phone } });
  }

  async updateAccount(id: string, data: Partial<Account>) {
    return this.prisma.account.update({ where: { id }, data });
  }
}
```

#### 3. **Атомарность операций**

Все операции в БД происходят последовательно:

1. Проверка уникальности
2. Генерация OTP
3. Создание Pending
4. Verify OTP
5. Update Account
6. Delete Pending

#### 4. **Защита от race conditions**

`UNIQUE(account_id, type)` в БД предотвращает одновременные изменения одного типа контакта.

Если пользователь попытается инициировать изменение email дважды, второй запрос перезапишет первый pending (благодаря UNIQUE constraint).

---

### Пример полного сценария использования

```typescript
// 1. Пользователь хочет изменить email
const response1 = await fetch("/account/email/init", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email: "newemail@example.com" }),
});
// Ответ: { ok: true }
// Пользователь получает код на newemail@example.com

// 2. Пользователь вводит полученный код
const response2 = await fetch("/account/email/confirm", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "newemail@example.com",
    code: "123456",
  }),
});
// Ответ: { ok: true }
// Email успешно изменен!

// 3. Проверка обновленных данных
const response3 = await fetch("/account", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
// Ответ: {
//   id: "user123",
//   email: "newemail@example.com",
//   isEmailVerified: true,
//   ...
// }
```

---

Это полная документация процесса изменения контактных данных в системе! 📧📱
