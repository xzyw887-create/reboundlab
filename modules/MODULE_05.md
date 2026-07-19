# MODULE_05 — Users

## Статус: ⏳ Pending

## Цель

Profile CRUD, settings

## Папка

`/services/users`

## Зависимости

M04

## Ключевые файлы

- `services/users/src/users.controller.ts`
- `services/users/src/users.service.ts`

## Таблицы БД

core.users, core.user_settings

## Входные данные

Зависит от модуля — см. ARCHITECTURE.md

## Выходные данные

User profile DTO

## API (если применимо)

См. `docs/API.md`

## Правила разработки

1. Читать только этот файл + PROJECT_INDEX.md
2. Перечислить файлы перед изменением
3. Обновить статус в PROJECT_INDEX.md после завершения

## Тесты

- Unit tests в `tests/` или рядом с модулем
- Integration tests для API endpoints

