Порядок выполнения:

1. свой npm пакет (ticket-for-cinema-service) для скачки его на любых сервисах (prettier, utils, types)
2. gateway-service (базовая настройка запуска, Cors, HealthCheck), swagger,
3. contracts/proto/auth.proto (создание proto файла для gRPC) где вся настройка контрактов и загрузим это не npm чтоб
   пользоваться во всех сервисах
4. Настройка gRPC в auth-service и gateway-service. Теперь они могут общаться друг с другом
5. создали общий контейнер для всех сервисов в docker-compose.yml
6. настраиваем prisma orm в auth-service ( yarn add prisma @prisma/client @prisma/adapter-pg)
   - потом yarn prisma init (создает файлы для настройки prisma- schema.prisma и .env)
7. подключили redis для сохранения otp кодов
8. сделали роут с логикой на верификацию OTP кода и возвращением токенов (access и refresh)
9. решаем проблему централизованного обработки ошибок в микросервисах и grpc

   это триггер для комита
   git commit --allow-empty -m "trigger: test with new commit"
