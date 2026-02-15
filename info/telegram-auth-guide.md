# 🚀 Авторизация через Telegram - полное руководство

## 📋 Обзор процесса

Авторизация через Telegram использует **OAuth 2.0** протокол. Пользователь не вводит пароль в вашем приложении, а доверяет Telegram идентифицировать его личность.

---

## 🔄 Полная схема авторизации

```
┌─────────┐         ┌─────────┐         ┌──────────┐         ┌──────────┐
│ Клиент  │         │ Gateway │         │   Auth   │         │ Telegram │
│(Браузер)│         │ Service │         │ Service  │         │  Server  │
└────┬────┘         └────┬────┘         └────┬─────┘         └────┬─────┘
     │                   │                   │                     │
     │ ════════════ ШАГ 1: ПОЛУЧЕНИЕ URL ═════════════════════════
     │                   │                   │                     │
     │ GET /auth/telegram│                   │                     │
     ├──────────────────►│                   │                     │
     │                   │ gRPC TelegramInit │                     │
     │                   ├──────────────────►│                     │
     │                   │                   │ Генерация URL       │
     │                   │                   │ с параметрами бота  │
     │                   │                   │                     │
     │                   │ { url: "https://oauth.telegram.org/..." }
     │                   │◄──────────────────┤                     │
     │ { url: "..." }    │                   │                     │
     │◄──────────────────┤                   │                     │
     │                   │                   │                     │
     │ ════════════ ШАГ 2: РЕДИРЕКТ НА TELEGRAM ══════════════════
     │                   │                   │                     │
     │ Пользователь кликает на ссылку        │                     │
     │ Браузер открывает Telegram OAuth      │                     │
     ├───────────────────────────────────────────────────────────►│
     │                   │                   │   GET /auth?bot_id=...
     │                   │                   │                     │
     │                   │                   │   Telegram показывает:
     │                   │                   │   "Приложение X хочет
     │                   │                   │    получить ваши данные"
     │                   │                   │   [Разрешить] [Отмена]
     │                   │                   │                     │
     │ ════════════ ШАГ 3: ПОДТВЕРЖДЕНИЕ ═════════════════════════
     │                   │                   │                     │
     │ Пользователь нажимает "Разрешить"     │                     │
     │                   │                   │                     │
     │ Telegram редиректит обратно на ваш сайт с данными           │
     │◄───────────────────────────────────────────────────────────┤
     │ GET https://yoursite.com/callback?                          │
     │     id=123456&                                              │
     │     first_name=John&                                        │
     │     username=john_doe&                                      │
     │     hash=abc123...                                          │
     │                   │                   │                     │
     │ ════════════ ШАГ 4: ВЕРИФИКАЦИЯ ═══════════════════════════
     │                   │                   │                     │
     │ POST /auth/telegram/verify            │                     │
     │ Body: { tgAuthResult: "base64(json)" }  │                   │
     ├──────────────────►│                   │                     │
     │                   │ JSON.parse(atob()) │                     │
     │                   │ декодирует данные  │                     │
     │                   │                   │                     │
     │                   │ gRPC TelegramVerify                     │
     │                   │ { query: {...} }  │                     │
     │                   ├──────────────────►│                     │
     │                   │                   │ 1. Проверка hash    │
     │                   │                   │    (подпись от TG)  │
     │                   │                   │ 2. Поиск/создание   │
     │                   │                   │    пользователя     │
     │                   │                   │ 3. Генерация токенов│
     │                   │                   │                     │
     │                   │ { accessToken, refreshToken, user }     │
     │                   │◄──────────────────┤                     │
     │ { accessToken, user }                 │                     │
     │ + Cookie: refreshToken                │                     │
     │◄──────────────────┤                   │                     │
     │                   │                   │                     │
     │ ✅ Авторизован!   │                   │                     │
```

---

## 🎯 Зачем нужен URL?

URL - это адрес специальной страницы Telegram OAuth, где пользователь подтверждает, что разрешает вашему приложению получить его данные.

### **Компоненты URL:**
```typescript
const url = new URL("https://oauth.telegram.org/auth");

// ID вашего бота
url.searchParams.append("bot_id", "7955980190");

// Откуда пришел запрос (ваш сайт)
url.searchParams.append("origin", "https://yoursite.com");

// Запрашиваем доступ к данным пользователя
url.searchParams.append("request_access", "write");

// Куда вернуть пользователя после авторизации
url.searchParams.append("return_to", "https://yoursite.com");
```

---

## 📊 Детальное описание каждого шага

### **ШАГ 1: Получение URL от вашего сервера**

**Эндпоинт:** `GET /auth/telegram`

**Что происходит:**
```typescript
// telegram.service.ts
public getAuthUrl(): TelegramInitResponse {
  const url = new URL("https://oauth.telegram.org/auth");
  
  url.searchParams.append("bot_id", this.BOT_ID);
  url.searchParams.append("origin", this.REDIRECT_ORIGIN);
  url.searchParams.append("request_access", "write");
  url.searchParams.append("return_to", this.REDIRECT_ORIGIN);
  
  return { url: url.href };
}
```

**Результат:**
```json
{
  "url": "https://oauth.telegram.org/auth?bot_id=7955980190&origin=https%3A%2F%2Fyoursite.com&request_access=write&return_to=https%3A%2F%2Fyoursite.com"
}
```

---

### **ШАГ 2: Пользователь переходит по ссылке**

**Что видит пользователь:**
```
┌─────────────────────────────────────┐
│   Telegram OAuth                    │
├─────────────────────────────────────┤
│                                     │
│  Приложение "Cinema Tickets"       │
│  хочет получить доступ к:          │
│                                     │
│  ✓ Ваше имя                        │
│  ✓ Ваш username                    │
│  ✓ Ваше фото профиля               │
│                                     │
│  [Разрешить]  [Отмена]             │
│                                     │
└─────────────────────────────────────┘
```

---

### **ШАГ 3: Telegram возвращает данные**

**После нажатия "Разрешить", Telegram редиректит пользователя обратно:**

```
https://yoursite.com/telegram-callback?
  id=123456789&
  first_name=John&
  last_name=Doe&
  username=john_doe&
  photo_url=https://...&
  auth_date=1708012345&
  hash=abc123def456...
```

**Важные параметры:**
- `id` - уникальный ID пользователя в Telegram
- `first_name`, `last_name` - имя пользователя
- `username` - @username в Telegram
- `photo_url` - ссылка на аватар
- `auth_date` - timestamp авторизации
- `hash` - **криптографическая подпись** от Telegram

---

### **ШАГ 4: Верификация и создание сессии**

**Эндпоинт:** `POST /auth/telegram/verify`

**Что происходит в коде:**

#### **4.1. Декодирование данных в Gateway:**
```typescript
@Post('telegram/verify')
public async telegramVerify(@Body() dto: TelegramVerifyRequest) {
  // Декодируем base64 и парсим JSON
  const query = JSON.parse(atob(dto.tgAuthResult));
  console.log('Telegram query:', query);
  
  // Отправляем в Auth Service для верификации
  return this.authGrpcClient.telegramVerify({ query });
}
```

#### **4.2. Верификация в Auth Service:**
```typescript
public async verifyAuth(query: Record<string, string>) {
  // 1. ПРОВЕРКА ПОДПИСИ (hash)
  const dataCheckString = Object.keys(query)
    .filter(key => key !== 'hash')
    .sort()
    .map(key => `${key}=${query[key]}`)
    .join('\n');
  
  const secretKey = crypto
    .createHash('sha256')
    .update(this.BOT_TOKEN)
    .digest();
  
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  
  if (calculatedHash !== query.hash) {
    throw new Error("Invalid hash - data is fake!");
  }
  
  // 2. ПРОВЕРКА ВРЕМЕНИ (не старше 24 часов)
  const authDate = parseInt(query.auth_date);
  if (Date.now() / 1000 - authDate > 86400) {
    throw new Error("Auth data expired");
  }
  
  // 3. ПОИСК ИЛИ СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ
  let user = await this.userRepo.findUserByTelegramId(query.id);
  
  if (!user) {
    user = await this.userRepo.createAccount({
      telegramId: query.id,
      username: query.username,
      firstName: query.first_name,
      lastName: query.last_name,
      photoUrl: query.photo_url,
      role: 'USER'
    });
  }
  
  // 4. ГЕНЕРАЦИЯ ТОКЕНОВ
  const { accessToken, refreshToken } = 
    await this.passportService.generateTokenPair(user.id);
  
  return { accessToken, refreshToken, user };
}
```

---

## 🔐 Почему это безопасно?

### **1. Криптографическая подпись (hash)**
- Telegram подписывает данные секретным ключом вашего бота
- Вы проверяете эту подпись на своем сервере
- Невозможно подделать данные без знания секретного ключа

**Как работает подпись:**
```typescript
// Telegram делает это на своей стороне:
const hash = HMAC_SHA256(secret_key, "auth_date=1708012345\nfirst_name=John\nid=123456\nusername=john_doe");

// Вы делаете это на своей стороне:
const calculatedHash = HMAC_SHA256(secret_key, "auth_date=1708012345\nfirst_name=John\nid=123456\nusername=john_doe");

// Сравниваем:
if (calculatedHash === receivedHash) {
  // ✅ Данные настоящие
} else {
  // ❌ Данные подделаны
}
```

### **2. Временная метка (auth_date)**
- Данные действительны только 24 часа
- Защита от replay атак (повторного использования старых данных)

### **3. Никаких паролей**
- Пользователь не вводит пароль в вашем приложении
- Telegram гарантирует, что это реальный пользователь

---

## 📝 Структура данных

### **DTO для запроса верификации:**
```typescript
export class TelegramVerifyRequest {
  @ApiProperty({
    example: 'eyJpZCI6NTI1MzY2Nzk0LCJmaXJzdF9uYW1lIjoiUnVzbGFuIiwidXNlcm5hbWUiOi...'
  })
  @IsString()
  @IsNotEmpty()
  public tgAuthResult: string  // base64 закодированный JSON с query параметрами
}
```

### **Структура данных от Telegram:**
```typescript
interface TelegramAuthData {
  id: string;           // Уникальный ID пользователя
  first_name: string;   // Имя
  last_name?: string;   // Фамилия (опционально)
  username?: string;    // @username (опционально)
  photo_url?: string;   // URL аватара (опционально)
  auth_date: string;    // Timestamp авторизации
  hash: string;         // Криптографическая подпись
}
```

### **Структура ответа:**
```typescript
interface TelegramVerifyResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    telegramId: string;
    username?: string;
    firstName: string;
    lastName?: string;
    photoUrl?: string;
    role: 'USER' | 'ADMIN';
    createdAt: string;
    updatedAt: string;
  };
}
```

---

## 💡 Практический пример использования на фронтенде

### **1. Инициация авторизации:**
```javascript
// Получаем URL для Telegram OAuth
const response = await fetch('/auth/telegram');
const { url } = await response.json();

// Открываем popup для авторизации
const popup = window.open(url, 'telegram-auth', 'width=600,height=600');
```

### **2. Обработка callback от Telegram:**
```javascript
// Слушаем сообщения от popup окна
window.addEventListener('message', async (event) => {
  if (event.data.type === 'telegram-callback') {
    try {
      // Кодируем query параметры в base64
      const tgAuthResult = btoa(JSON.stringify(event.data.query));
      
      // Отправляем на верификацию
      const authResponse = await fetch('/auth/telegram/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tgAuthResult })
      });
      
      const { accessToken, user } = await authResponse.json();
      
      // Сохраняем токен и пользователь авторизован!
      localStorage.setItem('accessToken', accessToken);
      console.log('User authorized:', user);
      
      // Закрываем popup
      popup.close();
      
      // Редирект на главную страницу
      window.location.href = '/dashboard';
      
    } catch (error) {
      console.error('Telegram auth error:', error);
      popup.close();
    }
  }
});
```

### **3. В popup окне (telegram-callback.html):**
```html
<script>
  // Получаем query параметры из URL
  const query = new URLSearchParams(window.location.search);
  const queryObject = Object.fromEntries(query.entries());
  
  // Отправляем данные в родительское окно
  window.opener.postMessage({
    type: 'telegram-callback',
    query: queryObject
  }, window.location.origin);
  
  // Закрываем popup
  window.close();
</script>
```

---

## ⚠️ Возможные ошибки и их решение

### **1. Invalid hash - data is fake!**
**Причина:** Подпись не совпадает
**Решение:** Проверить правильность формирования dataCheckString и секретного ключа

### **2. Auth data expired**
**Причина:** Данные старше 24 часов
**Решение:** Пользователь должен заново авторизоваться

### **3. Bot token invalid**
**Причина:** Неверный токен бота
**Решение:** Проверить переменную окружения `TELEGRAM_BOT_TOKEN`

### **4. CORS ошибки**
**Причина:** Popup не может отправить сообщение в родительское окно
**Решение:** Убедиться, что `window.location.origin` совпадает

---

## 🛠️ Настройка окружения

### **Переменные окружения:**
```env
# Telegram Bot Settings
TELEGRAM_BOT_ID=7955980190
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_REDIRECT_ORIGIN=https://yoursite.com
```

### **Создание Telegram бота:**
1. Найдите @BotFather в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Получите `BOT_ID` и `BOT_TOKEN`
5. Настройте `BOT_USERNAME`

---

## 📋 Чеклист реализации

- [ ] Создать Telegram бота через @BotFather
- [ ] Добавить переменные окружения
- [ ] Реализовать `GET /auth/telegram` (получение URL)
- [ ] Реализовать `POST /auth/telegram/verify` (верификация)
- [ ] Добавить проверку hash в Auth Service
- [ ] Добавить логику создания/поиска пользователя
- [ ] Настроить фронтенд для popup авторизации
- [ ] Добавить обработку ошибок
- [ ] Тестировать полный цикл авторизации

---

## 🎯 Преимущества Telegram OAuth

### **Для пользователя:**
- ✅ Не нужно регистрироваться
- ✅ Не нужно запоминать пароль
- ✅ Один клик для авторизации
- ✅ Доверие к Telegram

### **Для разработчика:**
- ✅ Нет хранения паролей
- ✅ Меньше кода для регистрации
- ✅ Высокая безопасность
- ✅ Мгновенная авторизация

---

## 🔄 Альтернативные сценарии

### **1. Привязка Telegram к существующему аккаунту:**
```typescript
// Пользователь уже авторизован по email/phone
// И хочет привязать Telegram для удобного входа

POST /account/telegram/link
Body: { tgAuthResult: "base64(...)" }

// Логика:
// 1. Верифицируем данные Telegram
// 2. Находим пользователя по userId из токена
// 3. Обновляем пользователя: telegramId = tg.id
// 4. Возвращаем успех
```

### **2. Вход через Telegram вместо email/phone:**
```typescript
// Полная замена email/phone авторизации
// Пользователь может войти только через Telegram

// Преимущества:
// - Нет необходимости в email/phone
// - Мгновенная регистрация
// - Высокая безопасность
```

---

## 📚 Дополнительные ресурсы

### **Официальная документация Telegram:**
- [Telegram Bot API - Login](https://core.telegram.org/widgets/login)
- [Telegram OAuth Documentation](https://core.telegram.org/api/oauth)

### **Полезные статьи:**
- [Implementing Telegram OAuth](https://medium.com/@username/implementing-telegram-oauth)
- [Security best practices for OAuth](https://oauth.net/2/)

---

Это полное руководство по реализации авторизации через Telegram в вашем проекте! 🚀
