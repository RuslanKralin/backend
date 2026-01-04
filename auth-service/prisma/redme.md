# Prisma ORM конспект

## Установка

```bash
yarn add prisma @prisma/client @prisma/adapter-pg
```

## Инициализация

```bash
yarn prisma init
```

Создает:

- `prisma/schema.prisma` - схема базы данных
- `.env` - переменные окружения

## Важные настройки для NestJS

### schema.prisma

```prisma
generator client {
  provider = "prisma-client"
  output   = "./generated"
  moduleFormat = "cjs" // важно для совместимости с NestJS
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### prisma.config.ts

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

## Основные команды

### Работа с базой данных

```bash
ПРИ ИЗМЕНЕНИИ СХЕМЫ НУЖНЫ ДОПОЛНИТЕЛЬНЫЕ МАНИПУЛЯЦИИ С КОМАНДАМИ ЧТОБ ОНИ ПРИМЕНИЛИСЬ В БД:

# 1. Применить изменения схемы в базе данных (без миграций)
yarn prisma db push

# 2. Перегенерировать Prisma клиент (обновить TypeScript типы)
yarn prisma generate

# 3. Перезапустить NestJS сервис
yarn start:dev

# Создать миграцию
yarn prisma migrate dev --name migration_name

# Применить миграции
yarn prisma migrate deploy

# Сбросить базу данных
yarn prisma migrate reset
```

### Генерация клиента

```bash
# Сгенерировать Prisma клиент
yarn prisma generate
```

### Просмотр и работа с данными

```bash
# Открыть Prisma Studio (визуальный интерфейс)
yarn prisma studio

# Проверить статус миграций
yarn prisma migrate status
```

## Интеграция с NestJS

### 1. Создать Prisma сервис

```typescript
// src/prisma/prisma.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaClient } from "./generated/client";

@Injectable()
export class PrismaService extends PrismaClient {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### 2. Создать модуль

```typescript
// src/prisma/prisma.module.ts
import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### 3. Использовать в других сервисах

```typescript
constructor(private readonly prisma: PrismaService) {}

// Пример использования
async createUser(data: CreateUserDto) {
  return this.prisma.account.create({ data });
}
```

## .env файл

```env
DATABASE_URL="postgresql://user:password@localhost:5433/dbname"
```

## Важные моменты

- `moduleFormat = "cjs"` обязателен для NestJS
- `yarn prisma db push` для разработки, `yarn prisma migrate dev` для продакшена
- Всегда генерируй клиент после изменений в схеме: `yarn prisma generate`
- Используй Prisma Studio для визуальной работы с данными

## Команда `yarn prisma generate`

🎯 Ключевая идея: Эта команда превращает твою схему в работающий TypeScript код с полной типизацией.

Теперь твой конспект по Prisma стал еще более полным и понятным!
**Что делает:** Генерирует TypeScript код на основе твоей Prisma схемы

**Зачем нужна:**

- Создает типизированный клиент для работы с базой данных
- Генерирует интерфейсы для всех моделей (Account, и т.д.)
- Обеспечивает автодополнение и типизацию в коде

**Когда выполнять:**

- После каждого изменения в `schema.prisma`
- Перед началом работы с проектом
- После добавления новых моделей или полей

**Что создается:**

- `prisma/generated/client.ts` - основной клиент
- Типы для всех моделей
- Методы для CRUD операций

**Пример использования после генерации:**

```typescript
// Теперь у тебя есть автодополнение и типизация
await this.prisma.account.create({
  data: {
    phone: "+1234567890",
    email: "user@example.com",
  },
});
```
