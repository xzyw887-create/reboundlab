# ReboundLab

Коммерческий SaaS для криптовалютного бэктестинга стратегий на отскоках после проливов.

## Статус

| Фаза | Статус |
|------|--------|
| Этап 0 — Проектирование | ✅ Завершён |
| Этап 1 — Фундамент | 🔄 В работе |

## Быстрый старт (для разработки)

```bash
# 1. Скопировать переменные окружения
cp .env.example .env

# 2. Запустить базу данных и Redis
docker compose -f deploy/docker/docker-compose.dev.yml up -d

# 3. Документация
open docs/PROJECT_INDEX.md
```

## Структура

- `apps/` — клиентские приложения (web, admin, office)
- `services/` — backend-микросервисы
- `packages/` — общие библиотеки
- `backtester/` — Python-движок расчётов
- `database/` — SQL-схемы и миграции
- `docs/` — архитектурная документация
- `modules/` — документация каждого модуля (MODULE_01…28)
- `rules/` — правила разработки

## Карта проекта

Перед любой задачей читайте:
1. `docs/PROJECT_INDEX.md` — карта модулей
2. `modules/MODULE_XX.md` — только нужный модуль

## Лицензия

Proprietary. All rights reserved.
