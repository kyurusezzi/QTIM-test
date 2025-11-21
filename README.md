# QTIM - REST API с аутентификацией и CRUD операциями

REST API на NestJS с JWT аутентификацией, CRUD операциями для статей, использованием PostgreSQL и Redis для кэширования.

## Технологический стек

- **NestJS** - фреймворк для построения серверных приложений
- **TypeScript** - типизированный JavaScript
- **PostgreSQL** - реляционная база данных
- **TypeORM** - ORM для работы с базой данных
- **Redis** - кэширование данных
- **JWT** - аутентификация
- **Docker** - контейнеризация PostgreSQL и Redis
- **Jest** - unit-тестирование

## Функциональность

- ✅ Регистрация и аутентификация пользователей (JWT)
- ✅ CRUD операции для статей
- ✅ Валидация входных данных
- ✅ Пагинация результатов
- ✅ Фильтрация статей по дате публикации, автору и поиску
- ✅ Кэширование данных в Redis
- ✅ Инвалидация кэша при обновлении/удалении
- ✅ Unit-тесты для бизнес-логики
- ✅ Защита эндпоинтов создания/обновления статей авторизацией

## Установка и запуск

### 1. Клонировать репозиторий

```bash
cd QTIM
```

### 2. Установить зависимости

```bash
npm install
```

### 3. Настроить переменные окружения

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Пример `.env`:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=qtim

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRATION=24h

# Application
PORT=3000
```

### 4. Запустить PostgreSQL и Redis через Docker

```bash
docker-compose up -d
```

### 5. Создать таблицы в базе данных

Таблицы уже созданы через SQL-скрипты. Если нужно пересоздать:

```bash
docker exec qtim-postgres psql -U postgres -d qtim -c 'DROP TABLE IF EXISTS articles CASCADE; DROP TABLE IF EXISTS users CASCADE;'
# Затем выполнить npm run start:dev
```

### 6. Запустить приложение

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

Приложение будет доступно на `http://localhost:3000`

## Тестирование

```bash
# Unit-тесты
npm run test

# E2E-тесты
npm run test:e2e

# Покрытие тестами
npm run test:cov
```

## API Документация

### Base URL
```
http://localhost:3000
```

---

## Аутентификация

### 1. Регистрация пользователя

**POST** `/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:** `201 Created`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Ошибки:**
- `409 Conflict` - Пользователь с таким email уже существует
- `400 Bad Request` - Невалидные данные

---

### 2. Вход в систему

**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Ошибки:**
- `401 Unauthorized` - Неверные учетные данные
- `400 Bad Request` - Невалидные данные

---

## Статьи (Articles)

### 3. Создать статью (требуется аутентификация)

**POST** `/articles`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "title": "Заголовок статьи",
  "description": "Описание статьи",
  "publicationDate": "2024-01-15T10:00:00.000Z"
}
```

**Response:** `201 Created`
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Заголовок статьи",
  "description": "Описание статьи",
  "publicationDate": "2024-01-15T10:00:00.000Z",
  "authorId": "user-id",
  "author": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Ошибки:**
- `401 Unauthorized` - Не авторизован
- `400 Bad Request` - Невалидные данные

---

### 4. Получить список статей (с пагинацией и фильтрами)

**GET** `/articles`

**Query Parameters:**
- `page` (optional, default: 1) - Номер страницы
- `limit` (optional, default: 10) - Количество элементов на странице
- `authorId` (optional) - Фильтр по ID автора
- `fromDate` (optional) - Фильтр по дате публикации (от)
- `toDate` (optional) - Фильтр по дате публикации (до)
- `search` (optional) - Поиск по заголовку и описанию

**Примеры запросов:**

1. Базовый запрос:
```
GET /articles?page=1&limit=10
```

2. Фильтр по автору:
```
GET /articles?authorId=user-id
```

3. Фильтр по датам:
```
GET /articles?fromDate=2024-01-01&toDate=2024-12-31
```

4. Поиск:
```
GET /articles?search=NestJS
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Заголовок статьи",
      "description": "Описание статьи",
      "publicationDate": "2024-01-15T10:00:00.000Z",
      "authorId": "user-id",
      "author": {
        "id": "user-id",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe"
      },
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

---

### 5. Получить одну статью по ID

**GET** `/articles/:id`

**Response:** `200 OK`
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Заголовок статьи",
  "description": "Описание статьи",
  "publicationDate": "2024-01-15T10:00:00.000Z",
  "authorId": "user-id",
  "author": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Ошибки:**
- `400 Bad Request` - Невалидный формат UUID
  ```json
  {
    "message": "Validation failed (uuid is expected)",
    "error": "Bad Request",
    "statusCode": 400
  }
  ```
- `404 Not Found` - Статья не найдена

---

### 6. Обновить статью (требуется аутентификация)

**PATCH** `/articles/:id`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "title": "Обновленный заголовок",
  "description": "Обновленное описание"
}
```

**Response:** `200 OK`
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Обновленный заголовок",
  "description": "Обновленное описание",
  "publicationDate": "2024-01-15T10:00:00.000Z",
  "authorId": "user-id",
  "author": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:30:00.000Z"
}
```

**Ошибки:**
- `400 Bad Request` - Невалидный формат UUID
  ```json
  {
    "message": "Validation failed (uuid is expected)",
    "error": "Bad Request",
    "statusCode": 400
  }
  ```
- `400 Bad Request` - Не предоставлено ни одного поля для обновления
  ```json
  {
    "message": "At least one field must be provided for update",
    "error": "Bad Request",
    "statusCode": 400
  }
  ```
- `401 Unauthorized` - Не авторизован
- `403 Forbidden` - Вы не являетесь автором этой статьи
- `404 Not Found` - Статья не найдена

---

### 7. Удалить статью (требуется аутентификация)

**DELETE** `/articles/:id`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:** `204 No Content`

**Ошибки:**
- `400 Bad Request` - Невалидный формат UUID
  ```json
  {
    "message": "Validation failed (uuid is expected)",
    "error": "Bad Request",
    "statusCode": 400
  }
  ```
- `401 Unauthorized` - Не авторизован
- `403 Forbidden` - Вы не являетесь автором этой статьи
- `404 Not Found` - Статья не найдена

---

## Примеры использования с cURL

### Регистрация
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Вход
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Создать статью
```bash
curl -X POST http://localhost:3000/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Моя первая статья",
    "description": "Это описание моей первой статьи",
    "publicationDate": "2024-01-15T10:00:00.000Z"
  }'
```

### Получить список статей
```bash
curl http://localhost:3000/articles?page=1&limit=10
```

### Получить одну статью
```bash
curl http://localhost:3000/articles/ARTICLE_ID
```

### Обновить статью
```bash
curl -X PATCH http://localhost:3000/articles/ARTICLE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Обновленный заголовок"
  }'
```

### Удалить статью
```bash
curl -X DELETE http://localhost:3000/articles/ARTICLE_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Структура проекта

```
src/
├── articles/              # Модуль статей
│   ├── dto/              # Data Transfer Objects
│   ├── entities/         # Entity для TypeORM
│   ├── articles.controller.ts
│   ├── articles.service.ts
│   ├── articles.service.spec.ts
│   └── articles.module.ts
├── auth/                 # Модуль аутентификации
│   ├── dto/              # DTOs для регистрации/входа
│   ├── guards/           # JWT Guard
│   ├── strategies/       # JWT Strategy
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.service.spec.ts
│   └── auth.module.ts
├── users/                # Модуль пользователей
│   ├── entities/         # User Entity
│   ├── users.service.ts
│   └── users.module.ts
├── config/               # Конфигурация
│   └── typeorm.config.ts
├── migrations/           # Миграции базы данных
├── app.module.ts         # Корневой модуль
└── main.ts              # Точка входа

```

## Кэширование

Приложение использует Redis для кэширования:

- **Список статей** - кэшируется на 5 минут с ключом, зависящим от параметров запроса
- **Отдельная статья** - кэшируется на 5 минут с ключом `article:{id}`
- **Инвалидация** - при создании, обновлении или удалении статьи кэш автоматически инвалидируется

## База данных

### Структура таблиц

#### Users
- `id` (UUID, PK)
- `email` (VARCHAR, UNIQUE)
- `password` (VARCHAR, хэшированный)
- `firstName` (VARCHAR)
- `lastName` (VARCHAR)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

#### Articles
- `id` (UUID, PK)
- `title` (VARCHAR)
- `description` (TEXT)
- `publicationDate` (TIMESTAMP)
- `authorId` (UUID, FK → users.id)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

### Индексы
- `IDX_articles_authorId` - для быстрой фильтрации по автору
- `IDX_articles_publicationDate` - для быстрой фильтрации по дате

---

## Лицензия

MIT

## Автор

@kyurusezzi (Garik Kyarunts)
