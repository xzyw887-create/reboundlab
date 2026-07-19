# MODULE_01 — Infrastructure & DevOps

## Статус: ✅ Done

## Цель

Monorepo, Docker, CI/CD, env config

## Папка

`/deploy, /.github, /scripts`

## Зависимости

—

## Ключевые файлы

- `deploy/docker/docker-compose.dev.yml`
- `.github/workflows/ci.yml`
- `package.json`
- `turbo.json`
- `.env.example`

## Таблицы БД

—

## Входные данные

Зависит от модуля — см. ARCHITECTURE.md

## Выходные данные

—

## API (если применимо)

См. `docs/API.md`

## Правила разработки

1. Читать только этот файл + PROJECT_INDEX.md
2. Перечислить файлы перед изменением
3. Обновить статус в PROJECT_INDEX.md после завершения

## Тесты

- Unit tests в `tests/` или рядом с модулем
- Integration tests для API endpoints

