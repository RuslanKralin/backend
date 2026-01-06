# Простая валидация переменных окружения

## Как это работает

1. **Валидаторы** - это классы, где мы описываем, какие переменные нам нужны и какие у них должны быть правила.

   ```typescript
   // Пример: config/validators/grpc.validator.ts
   import { IsInt, IsString } from 'class-validator';

   export class GrpcValidator {
     @IsString()
     public GRPC_HOST: string; // Должна быть строка

     @IsInt()
     public GRPC_PORT: number; // Должно быть целое число
   }
   ```

2. **Интерфейсы** - описывают структуру настроек. Просто перечисляем, какие поля и какого типа должны быть.

```typescript
// Пример: config/interfaces/grpc.interface.ts
export interface GrpcConfig {
  GRPC_HOST: string; // Строка с хостом
  GRPC_PORT: number; // Число с портом
}
```

3. **Настройка окружения** - связываем валидацию с реальными переменными.

```typescript
// Пример: config/env/grpc.env.ts
import { registerAs } from '@nestjs/config';
import type { GrpcConfig } from '../interfaces';
import { validateEnv } from '../../shared/utils';
import { GrpcValidator } from '../validators';

export const grpcEnv = registerAs<GrpcConfig>('grpc', () => {
  validateEnv(process.env, GrpcValidator);
  return {
    GRPC_HOST: process.env.GRPC_HOST,
    GRPC_PORT: parseInt(process.env.GRPC_PORT),
  };
});
```

4. **Использование** - добавляем настройки в конфигурацию приложения.

```typescript
import { ConfigType } from '@nestjs/config';
import { grpcEnv } from '../config/env/grpc.env';

@Injectable()
export class MyService {
  constructor(
    @Inject(grpcEnv.KEY)
    private readonly config: ConfigType<typeof grpcEnv>,
  ) {
    // Теперь config содержит проверенные переменные
    console.log('Подключаемся к:', `${config.GRPC_HOST}:${config.GRPC_PORT}`);
  }
}
```

Пример ошибки
Если что-то не так, например, не указан порт, вы увидите:

```
Error: Invalid environment variables:

Error in GRPC_PORT:
+ isInt: GRPC_PORT must be an integer number
+ isNotEmpty: GRPC_PORT should not be empty

```
