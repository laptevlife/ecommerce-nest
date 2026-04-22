# Codex Shop Backend

Масштабируемый backend foundation для интернет-магазина на `NestJS + Prisma + PostgreSQL`.

Что уже заложено:

- модульная архитектура для дальнейшего роста;
- `Swagger` на `/docs`;
- `Auth` с access/refresh JWT;
- `RBAC` через роли `ADMIN` и `CUSTOMER`;
- `Prisma` schema для `users`, `categories`, `products`, `carts`, `orders`, `payments`;
- базовые модули: `auth`, `users`, `categories`, `products`, `carts`, `orders`, `payments`, `health`;
- `docker-compose` для локального `PostgreSQL`;
- env-валидация через `zod`.

## Архитектура

Структура проекта:

```text
src/
  common/
    decorators/
    guards/
  modules/
    auth/
    carts/
    categories/
    config/
    health/
    orders/
    payments/
    prisma/
    products/
    users/
prisma/
  schema.prisma
```

Принципы:

- стартуем как `modular monolith`;
- бизнес-логика лежит в сервисах доменных модулей;
- контроллеры остаются тонкими;
- данные о цене заказа считаются на backend, а не доверяются клиенту;
- базовые security-практики включены сразу: validation, role guards, hashed passwords, hashed refresh tokens.

## Запуск

1. Скопировать env:

```bash
cp .env.example .env
```

2. Поднять Postgres:

```bash
docker compose up -d
```

3. Сгенерировать Prisma client:

```bash
npx prisma generate
```

4. Создать миграцию:

```bash
npx prisma migrate dev --name init
```

5. Запустить backend:

```bash
npm run start:dev
```

Swagger будет доступен по адресу:

```text
http://localhost:3001/docs
```

Health endpoint:

```text
http://localhost:3001/api/v1/health
```

## Рекомендуемый порядок дальнейшей реализации

1. Добавить seed для первого admin-пользователя.
2. Расширить `products` до variants / attributes / media gallery.
3. Добавить delivery, pricing, promo codes, notifications.
4. Вынести payment provider adapters в отдельный слой.
5. Добавить audit log, integration jobs и worker.

## Важная оговорка

Это именно **foundation**, а не полностью законченный production e-commerce. Каркас уже пригоден как база, но перед боевым запуском нужно будет добавить:

- миграции и seed-данные;
- тесты;
- обработку webhooks платежных провайдеров;
- delivery / pricing / promo rules;
- audit trail;
- файл-хранилище;
- интеграции.
