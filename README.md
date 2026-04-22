# Codex Shop Backend

Масштабируемый backend foundation для интернет-магазина на `NestJS + Prisma + PostgreSQL`.

Что уже заложено:

- модульная архитектура для дальнейшего роста;
- `Swagger` на `/docs`;
- `Auth` с access/refresh JWT;
- `RBAC` через роли `ADMIN` и `CUSTOMER`;
- `Prisma` schema для `users`, `categories`, `products`, `product_media`, `product_variants`, `carts`, `orders`, `payments`, `audit_logs`;
- базовые модули: `auth`, `users`, `categories`, `products`, `carts`, `orders`, `payments`, `health`;
- admin-модули: `dashboard`, `audit-logs`;
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
    dashboard/
    audit-logs/
prisma/
  schema.prisma
```

Принципы:

- стартуем как `modular monolith`;
- бизнес-логика лежит в сервисах доменных модулей;
- контроллеры остаются тонкими;
- данные о цене заказа считаются на backend, а не доверяются клиенту;
- базовые security-практики включены сразу: validation, role guards, hashed passwords, hashed refresh tokens.
- admin-операции фиксируются в `audit_logs`;
- каталог уже подготовлен под магазин инструментов: `brand`, `media gallery`, `variants`.

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

5. Создать первого admin:

```bash
npm run seed:admin
```

6. При желании наполнить базу демо-данными магазина инструментов:

```bash
npm run seed:demo
```

7. Запустить backend:

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

## Первый ADMIN

По умолчанию seed использует значения из `.env`:

```text
ADMIN_EMAIL=admin@codex-shop.local
ADMIN_PASSWORD=ChangeMe123!
```

Их лучше поменять до первого запуска на свои реальные.

Команда:

```bash
npm run seed:admin
```

Если пользователь уже существует, seed обновит его до роли `ADMIN`.

`seed:demo` дополнительно создает:

- категории под магазин инструментов;
- стартовые товары;
- product media;
- product variants;
- запись в audit log.

## Базовые admin CRUD-сценарии

Уже доступны backend-эндпоинты для админки:

- `GET /api/v1/users/admin/all`
- `GET /api/v1/users/admin/:id`
- `PATCH /api/v1/users/admin/:id`
- `GET /api/v1/orders/admin/all`
- `PATCH /api/v1/orders/:id/status`
- `GET /api/v1/dashboard/stats`
- `GET /api/v1/audit-logs`
- `POST /api/v1/categories`
- `GET /api/v1/categories`
- `PATCH /api/v1/categories/:id`
- `DELETE /api/v1/categories/:id`
- `GET /api/v1/products`
- `POST /api/v1/products`
- `PATCH /api/v1/products/:id`
- `DELETE /api/v1/products/:id`
- `POST /api/v1/products/:id/media`
- `POST /api/v1/products/:id/variants`
- `PATCH /api/v1/products/:id/variants/:variantId`

## Что уже умеет backend

- регистрация, логин, refresh token, logout;
- customer profile API;
- admin users list с фильтрами и пагинацией;
- categories CRUD с пагинацией;
- products CRUD с фильтрами и пагинацией;
- product media gallery;
- product variants;
- active cart;
- создание заказа из корзины;
- user orders list с фильтрами и пагинацией;
- admin orders list с фильтрами и пагинацией;
- payment records и подтверждение оплаты;
- dashboard stats для админки;
- audit log для ключевых admin-операций.

## Рекомендуемый порядок дальнейшей реализации

1. Добавить delivery, pricing, promo codes, notifications.
2. Вынести payment provider adapters в отдельный слой.
3. Добавить file storage и upload pipeline для product media.
4. Добавить audit log viewer в админский frontend.
5. Добавить integration jobs и worker для ERP/1С.

## Важная оговорка

Это именно **foundation**, а не полностью законченный production e-commerce. Каркас уже пригоден как база, но перед боевым запуском нужно будет добавить:

- тесты;
- обработку webhooks платежных провайдеров;
- delivery / pricing / promo rules;
- файл-хранилище;
- интеграции.
