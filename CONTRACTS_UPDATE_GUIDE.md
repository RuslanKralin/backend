# Руководство по обновлению контрактов (Contracts)

## Проблема

После изменения proto файлов TypeScript типы не обновляются автоматически, что приводит к ошибкам компиляции:

```
Module has no exported member 'IninEmailChangeRequest'
```

## Правильный процесс обновления контрактов

### Шаг 1: Измените proto файл

Например, добавьте новые сообщения в `contracts/proto/account.proto`:

```protobuf
service AccountService {
    rpc IninEmailChange (IninEmailChangeRequest) returns (IninEmailChangeResponse);
}

message IninEmailChangeRequest {
  string email = 1;
  string user_id = 2;
}

message IninEmailChangeResponse {
  bool ok = 1;
}
```

### Шаг 2: Перегенерируйте TypeScript типы

Откройте терминал в папке `contracts`:

```bash
cd D:\PROJECTS\MY\back\backend\contracts

# Генерируем TypeScript из proto файлов
yarn generate

# Компилируем TypeScript в JavaScript
yarn build
```

Команда `yarn generate` запускает:

```bash
protoc -I ./proto ./proto/*.proto --ts_proto_out=./gen --ts_proto_opt=nestJs=true,package=omit
```

Это создаст/обновит файлы в папке `gen/`:

- `gen/account.ts` - TypeScript типы и интерфейсы
- `gen/auth.ts` - и т.д.

### Шаг 3: Обновите версию пакета

В `contracts/package.json` увеличьте версию:

```json
{
  "version": "1.0.14" → "1.0.15"
}
```

### Шаг 4: Опубликуйте пакет в npm

```bash
# В папке contracts
npm publish
# или
yarn publish
```

**Важно:** Пакет автоматически публикуется в npm после сборки. Убедитесь что:

- Вы авторизованы в npm: `npm login`
- Версия в package.json увеличена (npm не позволит опубликовать ту же версию дважды)
- Файлы собраны: `dist/`, `gen/`, `proto/` включены в публикацию (см. `files` в package.json)

### Шаг 5: Обновите пакет в зависимых сервисах

В каждом сервисе (auth-service, gateway-service):

```bash
# Обновите до последней версии из npm
yarn upgrade @ticket_for_cinema/contracts

# Или установите конкретную версию
yarn add @ticket_for_cinema/contracts@1.0.15
```

**Для локальной разработки** (без публикации в npm):

```bash
# В папке contracts
yarn link

# В каждом сервисе
yarn link @ticket_for_cinema/contracts
```

### Шаг 6: Перезапустите сервисы

```bash
# В каждом сервисе
yarn start:dev
```

## Структура папок contracts

```
contracts/
├── proto/              # Исходные .proto файлы
│   ├── account.proto
│   └── auth.proto
├── gen/               # Сгенерированные TypeScript типы (НЕ редактировать вручную!)
│   ├── account.ts
│   └── auth.ts
├── src/               # Дополнительные утилиты
│   ├── index.ts       # Экспорты
│   └── proto-paths.ts # Пути к proto файлам
├── dist/              # Скомпилированный JavaScript (gitignored)
└── package.json
```

## Важные команды

| Команда                       | Описание                              |
| ----------------------------- | ------------------------------------- |
| `yarn generate`               | Генерирует TypeScript из proto файлов |
| `yarn build`                  | Компилирует TypeScript в JavaScript   |
| `yarn generate && yarn build` | Полная перегенерация и сборка         |

## Типичные ошибки

### ❌ Ошибка: "Module has no exported member"

**Причина:** Контракты не перегенерированы после изменения proto файла.

**Решение:**

```bash
cd contracts
yarn generate && yarn build
```

### ❌ Ошибка: "Cannot find module '@ticket_for_cinema/contracts'"

**Причина:** Пакет не установлен или устарел.

**Решение:**

```bash
yarn install
# или
yarn upgrade @ticket_for_cinema/contracts
```

### ❌ Ошибка: Старые типы после обновления

**Причина:** Кэш node_modules или dist папки.

**Решение:**

```bash
# В contracts
rm -rf dist node_modules
yarn install
yarn generate && yarn build

# В сервисе
rm -rf node_modules
yarn install
```

## Workflow для разработки (Production)

1. **Изменили proto** → `yarn generate && yarn build` в contracts
2. **Увеличили версию** → в package.json (обязательно!)
3. **Опубликовали в npm** → `npm publish` или `yarn publish`
4. **Обновили в сервисах** → `yarn upgrade @ticket_for_cinema/contracts`
5. **Перезапустили** → `yarn start:dev`

## Workflow для локальной разработки (без публикации)

1. **Изменили proto** → `yarn generate && yarn build` в contracts
2. **Создали симлинк** → `yarn link` в contracts (один раз)
3. **Подключили в сервисе** → `yarn link @ticket_for_cinema/contracts` (один раз)
4. **При изменениях** → только `yarn generate && yarn build` в contracts
5. **Перезапустили сервис** → `yarn start:dev`

## CI/CD для npm публикации

Поскольку пакет публикуется в npm, рекомендуется настроить автоматическую публикацию:

### GitHub Actions (рекомендуется)

Создайте `.github/workflows/publish.yml` в contracts:

```yaml
name: Publish to npm

on:
  push:
    branches: [main]
    paths:
      - "proto/**"
      - "package.json"

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "20"
          registry-url: "https://registry.npmjs.org"

      - name: Install dependencies
        run: yarn install

      - name: Generate types from proto
        run: yarn generate

      - name: Build
        run: yarn build

      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Настройка npm токена

1. Получите токен: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Добавьте в GitHub Secrets: `Settings → Secrets → NPM_TOKEN`

### Prepublish скрипт

Добавьте в `package.json` для автоматической сборки перед публикацией:

```json
{
  "scripts": {
    "generate": "protoc -I ./proto ./proto/*.proto --ts_proto_out=./gen --ts_proto_opt=nestJs=true,package=omit",
    "build": "tsc -p tsconfig.build.json",
    "prepublishOnly": "yarn generate && yarn build"
  }
}
```

Теперь при `npm publish` автоматически выполнится генерация и сборка.

## Автоматизация (опционально)

Можно добавить pre-commit hook для автоматической генерации:

```json
// package.json в contracts
{
  "scripts": {
    "precommit": "yarn generate && yarn build && git add gen/ dist/"
  }
}
```

## Проверка успешной генерации

После `yarn generate` проверьте файл `gen/account.ts`:

```typescript
// Должны появиться новые типы:
export interface IninEmailChangeRequest {
  email: string;
  userId: string;
}

export interface IninEmailChangeResponse {
  ok: boolean;
}

export interface AccountServiceClient {
  getAccount(request: GetAccountRequest): Observable<GetAccountResponse>;
  ininEmailChange(
    request: IninEmailChangeRequest,
  ): Observable<IninEmailChangeResponse>;
  // ... другие методы
}
```

## Итог

**Золотое правило:** После каждого изменения proto файлов **ВСЕГДА** запускайте:

```bash
cd contracts
yarn generate && yarn build
```

Только после этого обновляйте зависимости в других сервисах.
