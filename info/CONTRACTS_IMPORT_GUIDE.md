# Проблема с импортами из @ticket_for_cinema/contracts

## Что произошло?

Вы хотели использовать простые импорты типа:

```typescript
import { SendOtpRequest } from "@ticket_for_cinema/contracts";
```

Но вместо этого приходилось писать:

```typescript
import { SendOtpRequest } from "@ticket_for_cinema/contracts/dist/gen/auth";
```

## Почему так получилось?

### 1. Конфликт имен при экспорте

**Проблема:** В `contracts/src/index.ts` изначально использовался `export *`:

```typescript
export * from "../gen/auth";
export * from "../gen/account";
```

**Что пошло не так:** Оба файла (`gen/auth.ts` и `gen/account.ts`) экспортируют переменную с одинаковым именем:

```typescript
// В gen/auth.ts
export const protobufPackage = "auth.v1";

// В gen/account.ts
export const protobufPackage = "account.v1";
```

При `export *` TypeScript пытается реэкспортировать обе переменные `protobufPackage`, что создает конфликт имен.

**Решение:** Использовать именованные экспорты:

```typescript
export {
  SendOtpRequest,
  SendOtpResponse,
  // ... другие экспорты
} from "../gen/auth";
```

### 2. Проблема со структурой пакета

**Как работает NPM пакет:**

- `package.json` указывает `"main": "dist/index.js"` - это точка входа
- Когда вы пишете `import { X } from "@ticket_for_cinema/contracts"`, Node.js ищет файл по пути `node_modules/@ticket_for_cinema/contracts/dist/index.js`

**Проблема с `/gen` папкой:**

- Файлы в `gen/` - это TypeScript файлы (`.ts`)
- Node.js в runtime не может импортировать `.ts` файлы, только `.js`
- Поэтому импорт `@ticket_for_cinema/contracts/gen/account` не работал

**Решение:**

1. Добавить `gen/**/*` в `tsconfig.build.json`, чтобы TypeScript компилировал эти файлы в `dist/gen/`
2. Теперь структура пакета:
   ```
   node_modules/@ticket_for_cinema/contracts/
   ├── dist/
   │   ├── index.js          <- главный файл
   │   ├── gen/
   │   │   ├── auth.js       <- скомпилированные proto файлы
   │   │   └── account.js
   │   └── src/
   │       └── proto-paths.js
   ├── proto/                <- исходные .proto файлы
   └── package.json
   ```

### 3. Временное решение с `/dist/gen/`

Пока пакет публиковался, вы использовали:

```typescript
import { SendOtpRequest } from "@ticket_for_cinema/contracts/dist/gen/auth";
```

Это работает, потому что явно указывает путь к скомпилированным файлам.

## Как сделать красиво? (Идеальное решение)

### Вариант 1: Экспорт через главный файл (РЕКОМЕНДУЕТСЯ)

**В contracts/src/index.ts:**

```typescript
// Экспортируем все типы и интерфейсы через главный файл
export {
  // Auth
  SendOtpRequest,
  SendOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  RefreshTokensRequest,
  RefreshTokensResponse,
  AUTH_V1_PACKAGE_NAME,
  AuthServiceClient,
  AuthServiceController,
  AuthServiceControllerMethods,
  AUTH_SERVICE_NAME,
} from "../gen/auth";

export {
  // Account
  Role,
  GetAccountRequest,
  GetAccountResponse,
  ACCOUNT_V1_PACKAGE_NAME,
  AccountServiceClient,
  AccountServiceController,
  AccountServiceControllerMethods,
  ACCOUNT_SERVICE_NAME,
} from "../gen/account";

export { PROTO_PATH } from "./proto-paths";
```

**В auth-service используем:**

```typescript
import {
  SendOtpRequest,
  VerifyOtpRequest,
  Role,
} from "@ticket_for_cinema/contracts";
```

✅ **Плюсы:**

- Чистые импорты
- Централизованное управление экспортами
- Контроль над публичным API

❌ **Минусы:**

- Нужно вручную добавлять каждый новый тип в exports
- При добавлении новых proto файлов нужно обновлять index.ts

### Вариант 2: Package exports в package.json (СОВРЕМЕННЫЙ ПОДХОД)

**В contracts/package.json добавить:**

```json
{
  "name": "@ticket_for_cinema/contracts",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./auth": "./dist/gen/auth.js",
    "./account": "./dist/gen/account.js",
    "./proto-paths": "./dist/src/proto-paths.js"
  }
}
```

**В auth-service используем:**

```typescript
// Вариант 1: Через главный файл
import { SendOtpRequest } from "@ticket_for_cinema/contracts";

// Вариант 2: Прямой импорт из модуля
import { SendOtpRequest } from "@ticket_for_cinema/contracts/auth";
import { Role } from "@ticket_for_cinema/contracts/account";
```

✅ **Плюсы:**

- Гибкость - можно импортировать как из корня, так и из конкретных модулей
- Современный стандарт Node.js
- Tree-shaking работает лучше

❌ **Минусы:**

- Требует Node.js 12.7+ (у вас есть)
- Нужно настроить exports правильно

## Текущее состояние (что у вас сейчас)

**Сейчас работает:**

```typescript
import { SendOtpRequest } from "@ticket_for_cinema/contracts/dist/gen/auth";
import { Role } from "@ticket_for_cinema/contracts/dist/gen/account";
```

**Это не идеально, но работает**, потому что:

- Явно указывает путь к скомпилированным файлам
- Не зависит от настройки exports в package.json
- Обходит проблему с конфликтом имен

## Рекомендация: Что делать дальше

### Шаг 1: Обновить contracts пакет (уже сделано ✅)

- ✅ Именованные экспорты в `src/index.ts`
- ✅ Компиляция `gen/` файлов в `dist/gen/`
- ✅ Экспорт `PROTO_PATH`

### Шаг 2: Опубликовать версию с правильными экспортами

```bash
cd contracts
# Убедитесь что все экспорты в src/index.ts правильные
yarn run build
# Проверьте что dist/ содержит все нужные файлы
git add .
git commit -m "feat: proper exports structure"
git push origin main
```

### Шаг 3: Обновить импорты в auth-service

После публикации contracts@1.0.11+ (с правильными экспортами):

```typescript
// Было:
import { SendOtpRequest } from "@ticket_for_cinema/contracts/dist/gen/auth";

// Станет:
import { SendOtpRequest } from "@ticket_for_cinema/contracts";
```

### Шаг 4: Обновить gateway-service аналогично

## Частые ошибки и как их избежать

### ❌ Ошибка: "Cannot find module"

**Причина:** Пакет не опубликован или установлена старая версия

**Решение:**

```bash
yarn add @ticket_for_cinema/contracts@latest
```

### ❌ Ошибка: "has already exported a member named 'protobufPackage'"

**Причина:** Использование `export *` с файлами, которые экспортируют одинаковые имена

**Решение:** Использовать именованные экспорты

### ❌ Ошибка: "The invalid .proto definition"

**Причина:** Неправильный путь к .proto файлам

**Решение:** Использовать `PROTO_PATH` из contracts:

```typescript
import { PROTO_PATH } from "@ticket_for_cinema/contracts";
// Когда заработает корневой импорт
```

## Итоговая структура (цель)

```
contracts/
├── src/
│   ├── index.ts              <- Главный файл с экспортами
│   └── proto-paths.ts        <- Пути к proto файлам
├── gen/                      <- Генерируемые TS файлы
│   ├── auth.ts
│   └── account.ts
├── proto/                    <- Исходные proto файлы
│   ├── auth.proto
│   └── account.proto
├── dist/                     <- Скомпилированные файлы (публикуется)
│   ├── index.js
│   ├── gen/
│   │   ├── auth.js
│   │   └── account.js
│   └── src/
│       └── proto-paths.js
└── package.json

auth-service/
└── src/
    └── modules/
        └── auth/
            └── auth.service.ts
                // import { SendOtpRequest } from "@ticket_for_cinema/contracts";
```

## Выводы

1. **Проблема возникла** из-за конфликта имен при `export *` и неправильной структуры пакета
2. **Временное решение** - импорты через `/dist/gen/` работают, но не красиво
3. **Идеальное решение** - именованные экспорты через главный файл пакета
4. **Следующий шаг** - дождаться публикации contracts с правильными экспортами и обновить импорты на `@ticket_for_cinema/contracts`

---

**Дата создания:** 18.01.2026  
**Версия contracts:** 1.0.10 (текущая), 1.0.11+ (планируется с правильными экспортами)
