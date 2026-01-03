Порядок выполнения:

1. свой npm пакет (ticket-for-cinema-service) для скачки его на любых сервисах (prettier, utils, types)
2. gateway-service (базовая настройка запуска, Cors, HealthCheck), swagger,
3. contracts/proto/auth.proto (создание proto файла для gRPC) где вся настройка контрактов и загрузим это не npm чтоб
   пользоваться во всех сервисах
4.

это триггер для комита
git commit --allow-empty -m "trigger: test with new commit"
