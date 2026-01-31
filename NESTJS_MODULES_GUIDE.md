# Руководство по модулям и зависимостям в NestJS

## Содержание

1. [Основные концепции](#основные-концепции)
2. [Правила организации модулей](#правила-организации-модулей)
3. [Типичные ошибки и их решения](#типичные-ошибки-и-их-решения)
4. [Практические примеры](#практические-примеры)

---

## Основные концепции

### Что такое модуль в NestJS?

Модуль - это класс с декоратором `@Module()`, который организует код в логические блоки.

```typescript
@Module({
  imports: [], // Другие модули, которые нужны этому модулю
  controllers: [], // Контроллеры этого модуля
  providers: [], // Сервисы, которые создаются в этом модуле
  exports: [], // Что этот модуль предоставляет другим модулям
})
export class MyModule {}
```

### Ключевые понятия:

- **Providers** - сервисы, которые **создаются** в этом модуле
- **Imports** - модули, из которых мы **используем** сервисы
- **Exports** - сервисы, которые мы **предоставляем** другим модулям

---

## Правила организации модулей

### ✅ Правило 1: Один сервис - один владелец

**Каждый сервис должен быть создан только в ОДНОМ модуле.**

#### ❌ Неправильно (дублирование):

```typescript
// otp.module.ts
@Module({
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}

// auth.module.ts
@Module({
  providers: [OtpService], // ❌ Дублирование! OtpService уже создан в OtpModule
  imports: [OtpModule],
})
export class AuthModule {}
```

**Проблема:** NestJS попытается создать два экземпляра `OtpService`, что приведет к ошибке зависимостей.

#### ✅ Правильно:

```typescript
// otp.module.ts
@Module({
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}

// auth.module.ts
@Module({
  providers: [AuthService], // ✅ Только свои сервисы
  imports: [OtpModule], // ✅ OtpService приходит отсюда
})
export class AuthModule {}
```

---

### ✅ Правило 2: Импортируй модуль, а не сервис

**Если сервис экспортируется из модуля, импортируй модуль, а не добавляй сервис в providers.**

#### ❌ Неправильно:

```typescript
// redis.module.ts
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}

// account.module.ts
@Module({
  providers: [AccountService, OtpService], // ❌ OtpService нужен RedisService
  imports: [RedisModule], // ❌ RedisService есть, но OtpService не знает об этом
})
export class AccountModule {}
```

**Проблема:** `OtpService` зависит от `RedisService`, но NestJS не может найти `RedisService` для `OtpService`, потому что `OtpService` создается напрямую, а не через свой модуль.

#### ✅ Правильно:

```typescript
// redis.module.ts
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}

// otp.module.ts
@Module({
  imports: [RedisModule], // ✅ RedisService доступен здесь
  providers: [OtpService], // ✅ OtpService создается с RedisService
  exports: [OtpService], // ✅ Экспортируем для других
})
export class OtpModule {}

// account.module.ts
@Module({
  imports: [OtpModule], // ✅ Импортируем готовый модуль
  providers: [AccountService], // ✅ Только свои сервисы
})
export class AccountModule {}
```

---

### ✅ Правило 3: Цепочка зависимостей

**Модули могут импортировать другие модули, создавая цепочку зависимостей.**

```
RedisModule (RedisService)
    ↓ импортируется в
OtpModule (OtpService + RedisService)
    ↓ импортируется в
AuthModule (AuthService + OtpService)
```

#### Пример:

```typescript
// 1. Базовый модуль
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}

// 2. Средний модуль
@Module({
  imports: [RedisModule], // Получаем RedisService
  providers: [OtpService], // Создаем OtpService (использует RedisService)
  exports: [OtpService], // Экспортируем OtpService
})
export class OtpModule {}

// 3. Верхний модуль
@Module({
  imports: [OtpModule], // Получаем OtpService (внутри уже есть RedisService)
  providers: [AuthService], // Создаем AuthService (использует OtpService)
})
export class AuthModule {}
```

---

## Типичные ошибки и их решения

### Ошибка 1: "Nest can't resolve dependencies"

```
UnknownDependenciesException: Nest can't resolve dependencies of the OtpService (?).
Please make sure that the argument RedisService at index [0] is available in the AuthModule context.
```

**Причина:** Сервис добавлен в providers, но его зависимости не доступны в этом модуле.

**Решение:** Импортируй модуль, который экспортирует этот сервис.

#### ❌ Было:

```typescript
@Module({
  providers: [AuthService, OtpService], // OtpService нужен RedisService
  imports: [RedisModule], // RedisService есть, но не для OtpService
})
export class AuthModule {}
```

#### ✅ Стало:

```typescript
@Module({
  providers: [AuthService],
  imports: [OtpModule], // OtpModule уже содержит OtpService с RedisService
})
export class AuthModule {}
```

---

### Ошибка 2: Дублирование провайдеров

**Симптомы:** Странные ошибки, несколько экземпляров сервиса, проблемы с состоянием.

**Причина:** Сервис добавлен в providers в нескольких модулях.

#### ❌ Неправильно:

```typescript
// Module A
@Module({
  providers: [SharedService],
})
export class ModuleA {}

// Module B
@Module({
  providers: [SharedService], // ❌ Дублирование
})
export class ModuleB {}
```

#### ✅ Правильно:

```typescript
// shared.module.ts
@Module({
  providers: [SharedService],
  exports: [SharedService],
})
export class SharedModule {}

// Module A
@Module({
  imports: [SharedModule],
})
export class ModuleA {}

// Module B
@Module({
  imports: [SharedModule],
})
export class ModuleB {}
```

---

## Практические примеры

### Пример 1: Простая структура (один уровень)

```typescript
// database.module.ts - Базовый модуль
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}

// user.module.ts - Использует базовый модуль
@Module({
  imports: [DatabaseModule], // Получаем PrismaService
  providers: [UserService], // Создаем UserService (использует PrismaService)
  exports: [UserService], // Экспортируем для других
})
export class UserModule {}
```

**Использование в UserService:**

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService, // ✅ Доступен через DatabaseModule
  ) {}
}
```

---

### Пример 2: Многоуровневая структура

```typescript
// 1. Инфраструктурный слой
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}

// 2. Сервисный слой
@Module({
  imports: [RedisModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}

// 3. Бизнес-логика
@Module({
  imports: [CacheModule],
  providers: [ProductService],
})
export class ProductModule {}
```

**Цепочка зависимостей:**

```
ProductService → CacheService → RedisService
```

---

### Пример 3: Несколько зависимостей

```typescript
// Модуль с несколькими зависимостями
@Module({
  imports: [
    DatabaseModule, // Предоставляет PrismaService
    CacheModule, // Предоставляет CacheService
    LoggerModule, // Предоставляет LoggerService
  ],
  providers: [OrderService],
  controllers: [OrderController],
})
export class OrderModule {}
```

**OrderService использует все три сервиса:**

```typescript
@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService, // Из DatabaseModule
    private readonly cache: CacheService, // Из CacheModule
    private readonly logger: LoggerService, // Из LoggerModule
  ) {}
}
```

---

### Пример 4: Глобальные модули

**Для часто используемых сервисов можно создать глобальный модуль:**

```typescript
@Global() // ✅ Этот декоратор делает модуль глобальным
@Module({
  providers: [ConfigService, LoggerService],
  exports: [ConfigService, LoggerService],
})
export class CoreModule {}
```

**Теперь ConfigService и LoggerService доступны везде без импорта:**

```typescript
// Не нужно импортировать CoreModule
@Module({
  providers: [UserService],
})
export class UserModule {}

@Injectable()
export class UserService {
  constructor(
    private readonly config: ConfigService, // ✅ Доступен автоматически
  ) {}
}
```

---

## Чек-лист для проверки модулей

### ✅ Перед созданием модуля:

- [ ] Каждый сервис создается только в одном модуле (в `providers`)
- [ ] Если сервис используется в других модулях, он добавлен в `exports`
- [ ] Все зависимости сервиса доступны через `imports`
- [ ] Не дублируются провайдеры между модулями
- [ ] Импортируются модули, а не отдельные сервисы

### ✅ При ошибке "can't resolve dependencies":

1. Проверь, что сервис не добавлен напрямую в `providers`
2. Проверь, что импортирован модуль, который экспортирует этот сервис
3. Проверь цепочку зависимостей (все ли модули импортированы)

---

## Визуальная схема правильной организации

```
┌─────────────────────────────────────────────────────────────┐
│                        AppModule                            │
│  imports: [AuthModule, AccountModule]                       │
└─────────────────────────────────────────────────────────────┘
                    │                    │
        ┌───────────┘                    └───────────┐
        │                                            │
┌───────▼─────────────────┐              ┌──────────▼──────────────┐
│     AuthModule          │              │    AccountModule        │
│  imports: [OtpModule]   │              │  imports: [OtpModule]   │
│  providers: [AuthSvc]   │              │  providers: [AccSvc]    │
└─────────────────────────┘              └─────────────────────────┘
                    │                            │
                    └────────────┬───────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      OtpModule          │
                    │  imports: [RedisModule] │
                    │  providers: [OtpSvc]    │
                    │  exports: [OtpSvc]      │
                    └─────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     RedisModule         │
                    │  providers: [RedisSvc]  │
                    │  exports: [RedisSvc]    │
                    └─────────────────────────┘
```

---

## Итоговые правила (запомни!)

### 🎯 Золотые правила NestJS модулей:

1. **Один сервис = один владелец** - создавай сервис только в одном модуле
2. **Импортируй модули, не сервисы** - используй `imports`, а не дублируй `providers`
3. **Экспортируй для переиспользования** - если сервис нужен другим, добавь в `exports`
4. **Цепочка зависимостей** - модули могут импортировать другие модули
5. **Не дублируй** - если сервис в `exports`, не добавляй его в `providers` других модулей

### 📝 Простая формула:

```
Создаю сервис → providers
Использую чужой сервис → imports (модуль, который его экспортирует)
Делюсь сервисом → exports
```

---

## Реальные примеры из проекта

### 📦 Пример 1: RedisModule (базовый уровень)

```typescript
// src/infra/redis/redis.module.ts
import { Module } from "@nestjs/common";
import { RedisService } from "./redis.service";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [ConfigModule], // ← Импортируем ConfigModule для RedisService
  providers: [RedisService], // ← Создаём RedisService здесь
  exports: [RedisService], // ← Экспортируем для других модулей
})
export class RedisModule {}
```

**Что происходит:**

- `imports: [ConfigModule]` - RedisService нужен ConfigService (для подключения к Redis)
- `providers: [RedisService]` - RedisModule создаёт RedisService
- `exports: [RedisService]` - Другие модули могут использовать RedisService

---

### 📧 Пример 2: OtpModule (средний уровень)

```typescript
// src/modules/otp/otp.module.ts
import { Module } from "@nestjs/common";
import { OtpService } from "./otp.service";
import { RedisModule } from "@/infra/redis/redis.module";

@Module({
  imports: [RedisModule], // ← Получаем RedisService из RedisModule
  providers: [OtpService], // ← Создаём OtpService (использует RedisService)
  exports: [OtpService], // ← Экспортируем для бизнес-логики
})
export class OtpModule {}
```

**Что происходит:**

- `imports: [RedisModule]` - OtpService нужен RedisService для хранения OTP кодов
- `providers: [OtpService]` - OtpModule создаёт OtpService
- `exports: [OtpService]` - AuthModule и AccountModule могут использовать OtpService

---

### 👤 Пример 3: AccountModule (бизнес-логика)

```typescript
// src/modules/account/account.module.ts
import { Module } from "@nestjs/common";
import { AccountService } from "./account.service";
import { AccountController } from "./account.controller";
import { AccountRepo } from "./account.repo";
import { UserRepo } from "@/shared/repositories";
import { OtpModule } from "../otp/otp.module";

@Module({
  imports: [OtpModule], // ← Получаем OtpService
  controllers: [AccountController], // ← Контроллеры этого модуля
  providers: [AccountService, AccountRepo, UserRepo], // ← Создаём свои сервисы
})
export class AccountModule {}
```

**Что происходит:**

- `imports: [OtpModule]` - AccountService нужен OtpService для отправки OTP кодов
- `providers: [AccountService, AccountRepo, UserRepo]` - AccountModule создаёт свои сервисы
- `AccountService` может использовать `OtpService` (который внутри использует `RedisService`)

---

### 🔐 Пример 4: AuthModule (бизнес-логика)

```typescript
// src/modules/auth/auth.module.ts
import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { PrismaModule } from "@/infra/prisma/prisma.module";
import { AuthRepo } from "./auth.repo";
import { OtpModule } from "@/modules/otp/otp.module";
import { PassportModule } from "@ticket_for_cinema/passport";
import { ConfigService } from "@nestjs/config";
import { getPassportConfig } from "@/config/loaders";
import { UserRepo } from "@/shared/repositories";

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepo, UserRepo], // ← Создаём свои сервисы
  imports: [
    PrismaModule, // ← Для AuthRepo (база данных)
    OtpModule, // ← Для AuthService (OTP)
    PassportModule.registerAsync({
      // ← Для аутентификации
      useFactory: getPassportConfig,
      inject: [ConfigService],
    }),
  ],
})
export class AuthModule {}
```

**Что происходит:**

- `imports: [PrismaModule]` - AuthRepo нужен PrismaService для работы с базой
- `imports: [OtpModule]` - AuthService нужен OtpService для отправки OTP
- `imports: [PassportModule]` - AuthService нужен PassportService для токенов
- `providers: [AuthService, AuthRepo, UserRepo]` - AuthModule создаёт свои сервисы

---

## 📊 Полная цепочка зависимостей в проекте

```
┌─────────────────────────────────────────────────────────────┐
│                    ConfigModule                             │
│  providers: [ConfigService]                                │
│  exports: [ConfigService]                                   │
└─────────────────────────────────────────────────────────────┘
                          ↑ импортируют
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
┌───────────────┐                  ┌───────────────┐
│ PrismaModule   │                  │ RedisModule    │
│ imports:       │                  │ imports:       │
│   ConfigModule │                  │   ConfigModule │
│ providers:     │                  │ providers:     │
│   PrismaService│                  │   RedisService │
│ exports:       │                  │ exports:       │
│   PrismaService│                  │   RedisService │
└───────────────┘                  └───────────────┘
                          ↑ импортирует
                          │
                    ┌───────────────┐
                    │  OtpModule    │
                    │ imports:      │
                    │   RedisModule │
                    │ providers:    │
                    │   OtpService  │
                    │ exports:      │
                    │   OtpService  │
                    └───────────────┘
                          ↑ импортируют
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
┌───────────────┐                  ┌───────────────┐
│ AuthModule     │                  │ AccountModule  │
│ imports:       │                  │ imports:       │
│   PrismaModule │                  │   OtpModule    │
│   OtpModule    │                  │ providers:     │
│   PassportMod  │                  │   AccountSvc   │
│ providers:     │                  │   AccountRepo  │
│   AuthService  │                  │   UserRepo     │
│   AuthRepo     │                  └───────────────┘
│   UserRepo     │
└───────────────┘
```

---

## 🎯 Анализ реальных зависимостей

### Что использует каждый сервис:

```typescript
// RedisService
constructor(private config: ConfigService) // ← из ConfigModule

// OtpService
constructor(private redis: RedisService) // ← из RedisModule

// AuthRepo
constructor(private prisma: PrismaService) // ← из PrismaModule

// AuthService
constructor(
  private authRepo: AuthRepo,     // ← создан в AuthModule
  private userRepo: UserRepo,    // ← создан в AuthModule
  private otpService: OtpService, // ← из OtpModule
  private passportService: PassportService // ← из PassportModule
)

// AccountService
constructor(
  private accountRepo: AccountRepo, // ← создан в AccountModule
  private userRepo: UserRepo,        // ← из AccountModule
  private otpService: OtpService     // ← из OtpModule
)
```

---

## 📝 Почему именно такая структура?

### 1. **Разделение ответственности**

- `RedisModule` - только Redis
- `OtpModule` - только OTP логика
- `AuthModule` - только аутентификация
- `AccountModule` - только управление аккаунтом

### 2. **Переиспользование**

- `OtpService` используется и в `AuthModule`, и в `AccountModule`
- `RedisService` используется и в `OtpModule`, и может использоваться в других сервисах
- `UserRepo` используется и в `AuthModule`, и в `AccountModule`

### 3. **Тестируемость**

- Каждый модуль можно тестировать отдельно
- Легко мокать зависимости через imports

---

## 🚨 Реальная ошибка из проекта и её исправление

### Было (неправильно):

```typescript
// account.module.ts
@Module({
  controllers: [AccountController],
  providers: [AccountService, AccountRepo, UserRepo, OtpService], // ❌ Дублирование!
})
export class AccountModule {}
```

**Ошибка:**

```
UnknownDependenciesException: Nest can't resolve dependencies of the OtpService (?).
Please make sure that the argument RedisService at index [0] is available in the AccountModule context.
```

**Почему ошибка:** `OtpService` зависит от `RedisService`, но `RedisService` не импортирован в `AccountModule`.

### Стало (правильно):

```typescript
// account.module.ts
import { OtpModule } from "../otp/otp.module";

@Module({
  imports: [OtpModule], // ✅ Получаем OtpService
  controllers: [AccountController], // ✅ Контроллеры
  providers: [AccountService, AccountRepo, UserRepo], // ✅ Только свои сервисы
})
export class AccountModule {}
```

**Результат:** Все работает! ✅

---

## Итоговые правила (запомни!)

### 🎯 Золотые правила NestJS модулей:

1. **Один сервис = один владелец** - создавай сервис только в одном модуле
2. **Импортируй модули, а не сервисы** - используй `imports`, а не дублируй `providers`
3. **Цепочка зависимостей** - модули могут импортировать другие модули
4. **Не дублируй** - если сервис в `exports`, не добавляй его в `providers` других модулей

### 📝 Простая формула:

```
Создаю сервис → providers
Использую чужой сервис → imports (модуль, который его экспортирует)
Делюсь сервисом → exports
```

### 🎨 Реальная формула из проекта:

```
ConfigModule → RedisModule → OtpModule → {AuthModule, AccountModule}
ConfigModule → PrismaModule → AuthModule
ConfigModule → PassportModule → AuthModule
```

---

## Дополнительные ресурсы

- [Официальная документация NestJS - Modules](https://docs.nestjs.com/modules)
- [Dependency Injection в NestJS](https://docs.nestjs.com/fundamentals/custom-providers)
- [Common Errors - NestJS FAQ](https://docs.nestjs.com/faq/common-errors)
