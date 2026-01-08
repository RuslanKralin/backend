// ClassConstructor - тип для работы с классами
// plainToInstance - преобразует обычный объект в экземпляр класса
import { ClassConstructor, plainToInstance } from 'class-transformer';
// validateSync - синхронная функция валидации
import { validateSync } from 'class-validator';

// Функция для валидации переменных окружения
// Принимает:
// - config: объект с переменными окружения (например, process.env)
// - envVariablesClass: класс с декораторами валидации
export function validateEnv<T extends object>(
  config: Record<string, string | undefined>,
  envVariablesClass: ClassConstructor<T>,
) {
  // Преобразуем обычный объект в экземпляр класса
  // enableImplicitConversion: true - автоматически преобразует типы (строки в числа и т.д.)
  const validatedConfig = plainToInstance(envVariablesClass, config, {
    enableImplicitConversion: true,
  });

  // Выполняем валидацию
  // skipMissingProperties: false - валидируем все свойства, даже если они не указаны
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  // Если есть ошибки валидации
  if (errors.length > 0) {
    // Формируем читаемое сообщение об ошибке
    const errorMessage = errors
      .map(
        error =>
          `\nError in ${error.property}: \n ` +
          Object.entries(error.constraints)
            .map(([key, value]) => `+ \n${key}: ${value}`)
            .join('\n'),
      )
      .join('\n');

    // Выводим ошибку в консоль
    console.error(`\n\nInvalid environment variables:\n${errorMessage}\n\n`);
    // И выбрасываем исключение
    throw new Error(errorMessage);
  }

  // Если ошибок нет, возвращаем валидированный конфиг
  return validatedConfig;
}
