# Валидация переменных окружения - простыми словами

## Зачем это нужно?

Представь, что у тебя есть приложение, которому нужно подключиться к базе данных. Для этого ему нужны:

- Хост базы данных
- Порт
- Имя пользователя
- Пароль
- Имя базы

Все эти настройки хранятся в переменных окружения (.env файле). Но что если кто-то забудет указать порт или введет текст вместо числа? Приложение упадет при запуске!

**Валидация** - это как проверка документов перед полетом. Убеждаемся что все на месте и в правильном формате.

## Как это устроено у тебя?

### 1. **Валидаторы - правила проверки**

Это классы где описываем какие переменные нужны и какие у них должны быть правила:

```typescript
// config/validators/database.validator.ts
export class DatabaseValidator {
  @IsString() // Должно быть строкой
  public DATABASE_USER: string;

  @IsString() // Должно быть строкой
  public DATABASE_PASSWORD: string;

  @IsInt() // Должно быть числом
  @Min(1) // Минимум 1
  @Max(65535) // Максимум 65535
  public DATABASE_PORT: number;
}
```

**Простыми словами:** "Пользователь базы - строка, порт - число от 1 до 65535"

### 2. **Интерфейсы - структура данных**

Описываем как будут выглядеть наши настройки после валидации:

```typescript
// config/interfaces/database.interface.ts
export interface DatabaseConfig {
  user: string; // Имя пользователя
  password: string; // Пароль
  host: string; // Хост
  port: number; // Порт
  name: string; // Имя базы
}
```

**Простыми словами:** "Настройки базы будут содержать эти поля с такими типами"

### 3. **Настройка окружения - связываем всё вместе**

Берем переменные из .env файла, проверяем их и превращаем в удобный объект:

```typescript
// config/env/database.env.ts
export const databaseEnv = registerAs<DatabaseConfig>("database", () => {
  // 1. Проверяем все переменные по правилам из DatabaseValidator
  validateEnv(process.env, DatabaseValidator);

  // 2. Если все хорошо - возвращаем настроенный объект
  return {
    user: process.env.DATABASE_USER, // Берем из .env
    password: process.env.DATABASE_PASSWORD,
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT), // Превращаем строку в число
    name: process.env.DATABASE_NAME,
  };
});
```

**Простыми словами:** "Проверь переменные из .env по правилам и верни удобный объект"

### 4. **Подключение в приложении**

Добавляем наши настройки в общую конфигурацию:

```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseEnv, grpcEnv] // Загружаем наши настройки
    }),
    // ... другие модули
  ],
})
```

**Простыми словами:** "Загрузи настройки базы и gRPC при старте приложения"

### 5. **Использование в сервисах**

Теперь любой сервис может получить проверенные настройки:

```typescript
// infra/prisma/prisma.service.ts
constructor(configService: ConfigService<AllConfig>) {
  // Берем проверенные настройки базы
  const adapter = new PrismaPg({
    user: configService.get("database.user"),
    password: configService.get("database.password"),
    host: configService.get("database.host"),
    port: configService.get("database.port"),
    database: configService.get("database.name"),
  });
}
```

**Простыми словами:** "Дай мне проверенные настройки базы данных"

## Что будет если что-то не так?

### **Пример ошибки:**

Если в .env файле написать `DATABASE_PORT=abc` вместо числа:

```
Error in DATABASE_PORT:
+ isInt: DATABASE_PORT must be an integer number
+ isNotEmpty: DATABASE_PORT should not be empty
```

**Результат:** Приложение не запустится и сразу скажет что не так.

### **Без валидации:**

Приложение запустилось бы, упало бы при первом запросе к базе, и было бы непонятно в чем проблема.

## Преимущества такого подхода

✅ **Раннее обнаружение ошибок** - приложение не запустится с неверными настройками  
✅ **Чистые ошибки** - сразу видно какая переменная и что с ней не так  
✅ **Типобезопасность** - TypeScript знает что `port` это число, а не строка  
✅ **Автодополнение** - IDE подсказывает какие настройки доступны  
✅ **Централизация** - все настройки в одном месте с едиными правилами

## Итог

**Валидация env переменных** - это как страховка от глупых ошибок. Убеждаемся что все настройки правильные еще до того как приложение начнет работать с пользователями.

У тебя это реализовано по всем правилам NestJS с использованием `class-validator` и `registerAs` - это стандартный и надежный подход!
