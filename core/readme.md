# @ticket_for_cinema/core

Общий пакет с настройками для проекта ticket_for_cinema.

## Установка

```bash
npm install @ticket_for_cinema/core
# или
yarn add @ticket_for_cinema/core
```

---

## Как обновлять версию пакета

### Что такое версия?

Версия пакета выглядит так: `1.2.3`

- **1** - мажорная версия (большие изменения, могут сломать код)
- **2** - минорная версия (новые функции, но всё работает)
- **3** - патч версия (исправления багов)

### Шаг 1: Закоммитить все изменения

Перед обновлением версии нужно сохранить все изменения в git:

```bash
git add .
git commit -m "Описание изменений"
```

### Шаг 2: Обновить версию

Выберите нужную команду:

```bash
# Патч (1.0.0 → 1.0.1) - исправили баг небольшой
npm version patch

# Минор (1.0.0 → 1.1.0) - добавили новую функцию
npm version minor

# Мажор (1.0.0 → 2.0.0) - большие изменения
npm version major
```

Команда автоматически:

- Обновит версию в `package.json`
- Создаст git commit
- Создаст git tag

### Шаг 3: Опубликовать новую версию

```bash
npm publish
```

### Шаг 4: Запушить изменения в git

```bash
git push
git push --tags
```

---

## Быстрая шпаргалка

```bash
# Полный цикл обновления патч-версии:
git add .
git commit -m "Fix: описание исправления"
npm version patch
npm publish
git push && git push --tags

# Полный цикл обновления минор-версии:
git add .
git commit -m "Feature: новая функция"
npm version minor
npm publish
git push && git push --tags
```

---

## NPM токен (для CI/CD)

Токен хранится в секретах GitHub Actions:

- Перейдите в Settings → Secrets and variables → Actions
- Секрет называется `NPM_TOKEN`
- Используется автоматически при публикации через GitHub Actions
