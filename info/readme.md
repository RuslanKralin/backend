# Порядок выполнения проекта

### 1. Общий npm пакет (ticket-for-cinema-service)

**Зачем:** Чтобы все наши сервисы использовали одинаковые утилиты, типы и настройки форматирования.
**Что сделали:** Создали пакет с prettier, утилитами и общими типами, который можно устанавливать в любой сервис.

### 2. Gateway-service - наш главный вход

**Зачем:** Это точка входа для всех пользователей, которая будет перенаправлять запросы в другие сервисы.
**Что сделали:**

- Настроили базовый запуск сервера
- Включили CORS (чтобы фронтенд мог обращаться к API)
- Добавили HealthCheck (проверка что сервис работает)
- Настроили Swagger (документация API в браузере)

### 3. gRPC контракты между сервисами

**Зачем:** Чтобы сервисы могли общаться друг с другом по быстрому протоколу gRPC.
**Что сделали:**

- Создали файл `auth.proto` - это как договор между сервисами
- Описали там все возможные запросы и ответы (отправка OTP, проверка OTP)
- Сгенерировали TypeScript типы из этого файла
- Опубликовали в npm пакет чтобы все сервисы использовали одни и те же типы

### 4. Настройка gRPC общения

**Зачем:** Auth Service и Gateway должны понимать друг друга.
**Что сделали:**

- Настроили gRPC клиент в Gateway (он может отправлять запросы в Auth)
- Настроили gRPC сервер в Auth Service (он принимает запросы от Gateway)
- Теперь они могут обмениваться данными по gRPC протоколу

### 5. Docker-compose для всех сервисов

**Зачем:** Чтобы легко запускать все сервисы вместе.
**Что сделали:** Создали общий контейнер, который запускает Gateway, Auth Service, PostgreSQL и Redis одной командой.

### 6. Prisma ORM в Auth Service

**Зачем:** Чтобы удобно работать с базой данных PostgreSQL.
**Что сделали:**

- Установили Prisma и клиент для PostgreSQL
- Создали `schema.prisma` - файл где описана структура нашей базы
- Настроили подключение к базе через `.env` файл
- Теперь можем работать с базой через удобные TypeScript функции

### 7. Redis для хранения OTP кодов

**Зачем:** OTP коды нужно хранить временно и быстро получать доступ.
**Что сделали:**

- Подключили Redis как временное хранилище
- Настроили подключение с хостом localhost и портом 6379
- Теперь OTP коды хранятся в Redis с временем жизни (TTL)

### 8. Полная логика верификации OTP

**Зачем:** Основная функция нашего сервиса - проверка OTP кодов.
**Что сделали:**

- Создали эндпоинт для отправки OTP (генерирует 6-значный код, хеширует и сохраняет в Redis)
- Создали эндпоинт для проверки OTP (сравнивает введенный код с сохраненным)
- Если код верный - обновляем статус верификации пользователя
- Возвращаем access и refresh токены

### 9. Централизованная обработка ошибок

**Зачем:** Ошибки из Auth Service приходят в gRPC формате, а пользователю нужны понятные HTTP ошибки.
**Что сделали:**

- Создали `GlobalExceptionFilter` - это как универсальный переводчик ошибок
- Он ловит абсолютно все ошибки в Gateway
- gRPC ошибку "5 NOT_FOUND: Invalid code" превращает в HTTP 404 с сообщением "Invalid code"
- Все ошибки теперь в одном формате и легко читаются в Swagger

### 10. Общие типы и enum'ы для всех сервисов

**Зачем:** Чтобы все сервисы говорили на одном языке.
**Что сделали:**

- Создали папку `common/lib/enums` для общих перечислений (статусы, типы ошибок и т.д.)
- Настроили там package.json и TypeScript
- Это будет опубликовано в npm пакет чтобы все сервисы использовали одни и те же типы

### 11. Кастомная валидация переменных окружения

**Зачем:** Чтобы убедиться что все необходимые переменные (.env файлы) настроены правильно при запуске.
**Что планируем:** Создать отдельный пакет `common/lib/env` который будет проверять что все переменные существуют и имеют правильный формат.

---

    это триггер для комита
    git commit --allow-empty -m "trigger: test with new commit"

### 12. Собственная система токенов (Passport Token)

**Зачем:** Создать простую и безопасную систему токенов без зависимостей от JWT библиотек.
**Что сделали:**

- Создали пакет `passport` с собственной системой генерации и проверки токенов
- Токен состоит из 4 частей: `userId.iat.exp.signature`
- **userId** - ID пользователя в base64Url
- **iat** - время создания в timestamp (base64Url)
- **exp** - время истечения в timestamp (base64Url)
- **signature** - HMAC подпись от объединенных данных

**Как работает:**

```typescript
// Генерация токена
const token = generateToken(secretKey, userId, ttlInSeconds);
// Результат: dXNlcklkLWFzZGFzYXNk.MTc2Nzc5NDM0Ng.MTc2Nzc5Nzk0Ng.6y8wzZbBlK2I6L0mSkXyjyr/XnGniFnczW9zcjh7Eas=

// Проверка токена
const result = verifyToken(secretKey, token);
// Результат: { valid: true, userId: 'userId-asdasasd' }
```

**Безопасность:**

- HMAC подпись с секретным ключом - нельзя подделать
- `constantTimeEqual` - защита от timing attacks
- Проверка срока действия - токены автоматически истекают
- Base64Url кодировка - безопасно для URL

**Структура файлов:**

```
passport/lib/
├── index.ts          # основные функции generateToken/verifyToken
├── utils/
│   ├── base64.ts     # base64UrlEncode/Decode для URL-безопасности
│   └── crypto.ts     # constantTimeEqual для защиты от атак
```

**Преимущества перед JWT:**

- ✅ Полный контроль над форматом и логикой
- ✅ Меньше зависимостей (только Node.js crypto)
- ✅ Простая отладка - все части токена читаемы
- ✅ Легко расширить дополнительными полями
- ✅ Быстрее чем стандартные JWT библиотеки

### 13. Динамический модуль

yarn add @nestjs/common @nestjs/core reflect-metadata txjs
после создания я его подключил в auth-service и теперь там генерируются access и refresh токены методами из моего пакета passport который я опубликовал в npm

### 14. Установка refresh токена в куки на gateway service

```bash
yarn add cookie-parser
yarn add -D @types/cookie-parser
```

**Настройка защиты куки:**

1. `httpOnly: true` - защита от XSS атак (скрипт не может прочитать куки)
2. `secure: true` (в production) - передача куки только по HTTPS
3. `sameSite: 'lax'` - защита от CSRF атак
4. `domain: configService.get('COOKIES_DOMAIN')` - ограничение домена
5. `maxAge: 30 дней` - время жизни refresh токена
6. `signed: true` с COOKIES_SECRET - защита от подмены куки

**Пример кода:**

```typescript
res.cookie("refreshToken", refreshToken, {
  httpOnly: true, // Защита от XSS
  secure: process.env.NODE_ENV === "production", // Только HTTPS в продакшене
  sameSite: "lax", // Защита от CSRF
  domain: configService.get("COOKIES_DOMAIN"),
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
  signed: true, // Подпись куки
});
```

**Кратко об атаках:**

- **XSS (Cross-Site Scripting)**: Вредоносный код на странице.
  _Защита:_ `httpOnly` блокирует доступ JavaScript к куки.
- **CSRF (Cross-Site Request Forgery)**: Подмена запросов с других сайтов.
  _Защита:_ `sameSite: 'lax'` ограничивает отправку кук.

- **Подмена кук**: Изменение значений кук.
  _Защита:_ `signed: true` с COOKIES_SECRET.

- **Перехват кук**: В открытой сети.
  _Защита:_ `secure: true` (HTTPS).

- **Утечка на поддоменах**:
  _Защита:_ Ограничение `domain`.

### 15. Обновление токенов

1. нужно изменить контракты в contracts (auth.proto добаить метод обновления токенов)
   После реализации обновления токена, мы получаем новую пару access/refresh токенов и обновляем куки с новым refresh токеном.

### 16. logout

очистка куки

### 17. Реализация guards и decorators для защиты эндпоинтов где нужна авторизация

тут мы соблюдаем SRP и не пихаем их в нашу библиотеку passport (она только создает токен, проверяет и возвращает userId, подписывает, декодирует, проверяет что он не подделан ), наши все эти штуки распологаются чисто в gateway. Guard отвечает за проверку токена и возвращает userId, decorator отвечает за извлечение userId из запроса (внутри себя он использует этот же guard)

### 18. Добавляем поле к user дополнительно + role.

Роль нужна будет чтоб админ мог создавать сеансы, добавлять фильмы и т.п. Короче админский функционал

### 19. Реализация изменения контактов пользователя

1. нужно изменить контракты в contracts (auth.proto добавить методы изменения контактов)
2. Вынести логику проверки есть ли уже такая почта и тп из сервиса аутентификации в отдельный сервис, поскольку в сервисе account будет происходить смена и там тоже нужно будет проверять эти данные и чтоб не дублированть код я выношу эту логику в отдельный сервис (User сервис, но это не микросервис!)

### 20. Авторизация через телеграм

#### Архитектура и компоненты

1. **Обновление gRPC контрактов** (`contracts/proto/auth.proto`)
   - Добавлены методы `TelegramInit` и `TelegramVerify` в `AuthService`
   - `TelegramInitResponse` - возвращает URL для OAuth
   - `TelegramVerifyRequest` - принимает `map<string, string>` с данными от Telegram
   - `TelegramVerifyResponse` - использует `oneof` для возврата либо URL бота, либо токенов

2. **Создание TokenService** (отдельный модуль для генерации токенов)
   - **Причина выделения**: избежание циклических зависимостей между `AuthService` и `TelegramService`
   - **Ответственность**: только генерация и верификация токенов через `PassportService`
   - **Расположение**: `auth-service/src/modules/token/`
   - **Зависимости**: `ConfigService` (для TTL), `PassportService` (для генерации)
   - **Методы**:
     - `generateTokens(userId)` - создает access и refresh токены
     - `verify(token)` - проверяет валидность токена
   - **Использование**: в `AuthService` и `TelegramService` для унифицированной генерации токенов

3. **TelegramModule** (`auth-service/src/modules/telegram/`)
   - **TelegramService**:
     - `getAuthUrl()` - генерирует OAuth URL с параметрами (bot_id, origin, request_access, return_to)
     - `verify(data)` - проверяет hash подпись от Telegram и обрабатывает авторизацию
     - `checkTelegramAuth(query)` - криптографическая проверка подлинности данных через HMAC-SHA256
   - **TelegramController**: gRPC контроллер с методами `TelegramInit` и `TelegramVerify`
   - **TelegramRepository**: работа с БД для поиска пользователей по `telegramId`
   - **Зависимости**: `RedisService`, `ConfigService`, `TokenService`

4. **Обновление схемы БД** (`auth-service/prisma/schema.prisma`)
   - Добавлено поле `telegramId String? @unique` в модель `Account`
   - Поддержка множественных методов авторизации (email, phone, telegram)

5. **Конфигурация Telegram** (`auth-service/src/config/`)
   - `telegram.env.ts` - переменные окружения
   - `telegram.interface.ts` - TypeScript интерфейс
   - `telegram.validator.ts` - валидация конфигурации
   - **Переменные**: `TELEGRAM_BOT_ID`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_REDIRECT_ORIGIN`

6. **Gateway endpoints** (`gateway-service/src/modules/auth/`)
   - `GET /auth/telegram` - получение OAuth URL
   - `POST /auth/telegram/verify` - верификация данных от Telegram
   - `TelegramVerifyRequest` DTO - принимает base64-закодированные данные (`tgAuthResult`)

#### Процесс авторизации

1. **Инициализация**:
   - Клиент запрашивает `GET /auth/telegram`
   - Gateway → Auth Service (gRPC) → TelegramService.getAuthUrl()
   - Возвращается URL: `https://oauth.telegram.org/auth?bot_id=...&origin=...&request_access=write&return_to=...`

2. **Редирект на Telegram**:
   - Пользователь переходит по URL
   - Telegram показывает окно подтверждения
   - После согласия Telegram редиректит обратно с данными (id, username, first_name, hash, auth_date)

3. **Верификация**:
   - Клиент отправляет `POST /auth/telegram/verify` с base64-закодированными данными
   - Gateway декодирует и передает в Auth Service
   - TelegramService проверяет hash подпись (HMAC-SHA256)
   - Если пользователь существует → генерируются токены
   - Если новый пользователь → создается сессия в Redis и возвращается URL бота для дополнительной регистрации

4. **Безопасность**:
   - **Hash проверка**: данные от Telegram подписаны секретным ключом бота
   - **Алгоритм**: SHA256(bot_token) → HMAC-SHA256(secret_key, data_check_string)
   - **Защита от подделки**: невозможно создать валидный hash без bot_token

#### Архитектурные решения

1. **Разделение ответственности**:
   - `TokenService` - только токены (избегаем циклических зависимостей)
   - `TelegramService` - только Telegram OAuth логика
   - `AuthService` - общая логика аутентификации

2. **Модульная структура**:
   - `TokenModule` экспортирует `TokenService`
   - `TelegramModule` импортирует `TokenService` и экспортирует `TelegramService`
   - `AuthModule` импортирует оба модуля

3. **Providers vs Imports**:
   - **Providers** - сервисы, которыми владеет модуль (AuthService, UserRepo)
   - **Imports** - готовые модули с их сервисами (OtpModule, TelegramModule, TokenModule)
   - **Правило**: модули в imports, сервисы в providers (нельзя смешивать)

4. **Redis для сессий**:
   - Хранение временных данных авторизации (telegram_session:sessionId)
   - TTL 300 секунд (5 минут)
   - Используется для связи OAuth flow с регистрацией через бота

#### Гибридная система авторизации

Теперь поддерживается 3 метода:

- **Email + OTP** - классическая регистрация
- **Phone + OTP** - регистрация по телефону
- **Telegram OAuth** - мгновенная авторизация через Telegram

Пользователь может:

- Зарегистрироваться любым способом
- Привязать несколько методов к одному аккаунту
- Входить любым удобным способом
