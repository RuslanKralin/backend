# Ошибка: gRPC сервис не найден

## Что случилось?

При запуске gateway-service появилась ошибка:

```
InvalidGrpcServiceException: The invalid gRPC service (service "auth.v1.AuthService" not found)
```

Потом такая же ошибка с AccountService:

```
InvalidGrpcServiceException: The invalid gRPC service (service "account.v1.AccountService" not found)
```

## Почему это произошло?

### Простыми словами:

Представь, что у тебя есть телефонный справочник. В proto файле написано:

```protobuf
package auth.v1;
service AuthService { ... }
```

Мы думали, что сервис зарегистрирован под полным именем `auth.v1.AuthService` (как "Иванов Иван Иванович" в справочнике).

Но на самом деле `@grpc/proto-loader` регистрирует сервисы **БЕЗ** префикса пакета - просто `AuthService` (как просто "Иван" в справочнике).

### Технически:

В `auth.grpc.ts` мы пытались получить сервис так:

```typescript
this.client.getService<AuthServiceClient>("auth.v1.AuthService");
//                                         ^^^^^^^^^^^^^^^^^^^^
//                                         С префиксом пакета
```

Но `@grpc/proto-loader` с настройкой `keepCase: false` загружает сервис просто как `'AuthService'`.

## Где была ошибка?

### 1. AuthService (auth.grpc.ts)

**Было (неправильно):**

```typescript
// gateway-service/src/modules/auth/auth.grpc.ts:29-30
public onModuleInit() {
    this.authClient = this.client.getService<AuthServiceClient>(
        'auth.v1.AuthService'  // ❌ С префиксом пакета
    )
}
```

**Стало (правильно):**

```typescript
public onModuleInit() {
    this.authClient = this.client.getService<AuthServiceClient>('AuthService')  // ✅ Без префикса
}
```

### 2. AccountService (account.grpc.ts)

**Было (неправильно):**

```typescript
// gateway-service/src/modules/account/account.grpc.ts:23-24
private getAccountService(): AccountServiceClient {
    if (!this.accountService) {
        this.accountService = this.client.getService<AccountServiceClient>(
            'account.v1.AccountService'  // ❌ С префиксом пакета
        )
    }
    return this.accountService
}
```

**Стало (правильно):**

```typescript
private getAccountService(): AccountServiceClient {
    if (!this.accountService) {
        this.accountService = this.client.getService<AccountServiceClient>('AccountService')  // ✅ Без префикса
    }
    return this.accountService
}
```

## Как мы нашли решение?

1. **Прочитали ошибку** - она говорила что сервис `auth.v1.AuthService` не найден
2. **Проверили proto файл** - там было `package auth.v1; service AuthService`
3. **Проверили сгенерированные контракты** - там была константа `AUTH_SERVICE_NAME = "AuthService"` (без префикса!)
4. **Проверили конфигурацию gRPC** - там была опция `keepCase: false`
5. **Поняли** - proto-loader регистрирует сервисы БЕЗ префикса пакета

## Вторая проблема: Роли не работали

### Что случилось?

После исправления имён сервисов, роуты с защитой `@Protected(Role.ADMIN)` возвращали 403 даже для пользователей с ролью ADMIN в базе данных.

### Почему?

В proto файле роль определена как enum с числовыми значениями:

```protobuf
enum Role {
  USER = 0;
  ADMIN = 1;
}
```

Но при передаче через gRPC роль приходила как **строка** `"ADMIN"`, а не число `1`.

В guard мы проверяли:

```typescript
// Было неправильно:
const roleString = account.role === 1 ? "ADMIN" : "USER"; // Всегда USER, потому что account.role = "ADMIN" (строка)
```

### Временное решение:

1. **Создали локальный enum** в контроллере:

```typescript
// gateway-service/src/modules/auth/auth.controller.ts
enum Roles {
    USER = 'USER',
    ADMIN = 'ADMIN'
}

// Использование:
@Protected(Roles.ADMIN)
```

2. **Изменили декораторы** чтобы принимали строки вместо enum:

```typescript
// protected.decorator.ts
export const Protected = (...roles: string[]) => { ... }

// roles.decorator.ts
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)
```

3. **Исправили guard** чтобы правильно обрабатывал роли:

```typescript
// roles.guard.ts
let roleString: string;
if (typeof account.role === "number") {
  roleString = account.role === 1 ? "ADMIN" : "USER";
} else {
  roleString = String(account.role); // Если уже строка - просто конвертируем
}

if (!required.includes(roleString)) {
  throw new ForbiddenException(
    "You dont have permission to access this resource",
  );
}
```

## Правило на будущее

**При работе с gRPC сервисами в NestJS:**

✅ **ПРАВИЛЬНО:** Используй имя сервиса БЕЗ префикса пакета

```typescript
client.getService<ServiceClient>("ServiceName");
```

❌ **НЕПРАВИЛЬНО:** Не используй полное имя с пакетом

```typescript
client.getService<ServiceClient>("package.v1.ServiceName");
```

**Исключение:** Если в конфигурации gRPC явно указано `keepCase: true` и другие специальные настройки, тогда может потребоваться полное имя. Но по умолчанию - без префикса.

## Файлы которые мы изменили

1. `gateway-service/src/modules/auth/auth.grpc.ts` - убрали префикс `auth.v1.`
2. `gateway-service/src/modules/account/account.grpc.ts` - убрали префикс `account.v1.`
3. `gateway-service/src/shared/decorators/protected.decorator.ts` - изменили на `string[]`
4. `gateway-service/src/shared/decorators/roles.decorator.ts` - изменили на `string[]`
5. `gateway-service/src/shared/guards/roles.guard.ts` - добавили проверку типа роли
6. `gateway-service/src/modules/auth/auth.controller.ts` - создали локальный enum Roles

## Итог

Проблема была в **неправильном имени сервиса** при вызове `getService()`.

Proto-loader регистрирует сервисы по короткому имени (без пакета), а мы искали по полному имени.

Решение: использовать короткое имя сервиса без префикса пакета.
