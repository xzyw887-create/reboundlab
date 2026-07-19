# MODULE_04 — Auth

## Статус: ⏳ Pending

## Цель

JWT, register, login, refresh

## Папка

`/services/auth`

## Зависимости

M03

## Ключевые файлы

- `services/auth/src/auth.controller.ts`
- `services/auth/src/auth.service.ts`

## Таблицы БД

core.users, core.sessions

## Входные данные

Зависит от модуля — см. ARCHITECTURE.md

## Выходные данные

JWT tokens

## API (если применимо)

См. `docs/API.md`

## Правила разработки

1. Читать только этот файл + PROJECT_INDEX.md
2. Перечислить файлы перед изменением
3. Обновить статус в PROJECT_INDEX.md после завершения

## Тесты

- Unit tests в `tests/` или рядом с модулем
- Integration tests для API endpoints

