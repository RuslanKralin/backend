# Централизованная обработка ошибок в микросервисах

## Архитектура

У нас есть 2 типа сервисов:

- **Gateway** - HTTP API для пользователей
- **Auth Service** - внутренний сервис с бизнес-логикой

**Проблема:** ошибки из Auth Service приходят в gRPC формате, а пользователю нужны HTTP статусы.

## GlobalExceptionFilter

### 1. **Ловит ВСЕ ошибки**

```typescript
@Catch()  // Абсолютно все исключения
```

Перехватывает:

- gRPC ошибки (из Observable)
- HTTP ошибки (валидация, 404 и т.д.)
- Любые другие исключения

### 2. **Парсит gRPC ошибки**

```typescript
// gRPC ошибка: "5 NOT_FOUND: Invalid or expired code"
const match = exception.message.match(/^(\d+)\s+([^:]+):\s*(.*)$/)
// Результат: [5, "NOT_FOUND", "Invalid or expired code"]
```

### 3. **Конвертирует статусы**

```typescript
// gRPC код → HTTP статус
0 (OK) → 200
3 (INVALID_ARGUMENT) → 400
5 (NOT_FOUND) → 404
7 (PERMISSION_DENIED) → 403
16 (UNAUTHENTICATED) → 401
13 (INTERNAL) → 500
```

### 4. **Возвращает унифицированный ответ**

```json
{
	"statusCode": 404,
	"timestamp": "2026-01-05T16:47:00.000Z",
	"path": "/auth/verify-otp",
	"message": "Invalid or expired code"
}
```

## Почему это работает?

### **Проблема старого подхода:**

```typescript
@Catch(RpcException, HttpException)  // ❌ Только конкретные типы
```

- gRPC ошибки приходят как обычный `Error`, не `RpcException`
- RxJS Observable пробрасывает ошибки как обычные исключения
- Фильтр не перехватывал эти ошибки

### **Решение нового подхода:**

```typescript
@Catch()  // ✅ Абсолютно все исключения
```

- Ловит любой тип ошибки
- Парсит строку gRPC ошибки
- Централизует всю обработку

## Использование

### **Auth Service:**

```typescript
if (invalidCode) {
	throw new RpcException({
		code: 5, // NOT_FOUND
		message: 'Invalid or expired code'
	})
}
```

### **Gateway:**

```typescript
@Post('/verify-otp')
async verifyOtp(@Body() dto: VerifyOtpRequest) {
  // Просто вызываем, без try/catch!
  return this.authGrpcClient.verifyOtp(dto);
}
```

## Таблица ошибок

| gRPC код              | HTTP статус | Описание          |
| --------------------- | ----------- | ----------------- |
| 0 (OK)                | 200         | Успех             |
| 3 (INVALID_ARGUMENT)  | 400         | Неверные данные   |
| 5 (NOT_FOUND)         | 404         | Ресурс не найден  |
| 7 (PERMISSION_DENIED) | 403         | Нет доступа       |
| 16 (UNAUTHENTICATED)  | 401         | Не авторизован    |
| 13 (INTERNAL)         | 500         | Внутренняя ошибка |

## Подключение

В `main.ts` Gateway:

```typescript
import { GlobalExceptionFilter } from './shared/filters'

app.useGlobalFilters(new GlobalExceptionFilter())
```

## Преимущества

✅ **Централизованная обработка** - вся логика в одном месте  
✅ **Чистые контроллеры** - без try/catch блоков  
✅ **Унифицированные ответы** - один формат для всех ошибок  
✅ **Правильные статусы** - gRPC → HTTP конвертация  
✅ **Логирование** - все ошибки логируются  
✅ **Масштабируемость** - легко добавлять новые типы ошибок

Это идеальное решение для микросервисной архитектуры!
