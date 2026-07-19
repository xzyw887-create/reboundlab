# Market Data Service

Загрузка и обновление рыночных данных с Binance.

## Команды

```bash
# 1. Запустить базу данных (нужен Docker)
cd /Users/wasya8/Projects/reboundlab
npm run docker:up
bash scripts/migrate/apply.sh

# 2. Установить зависимости
python3 -m pip install -r services/market-data/requirements.txt

# 3. Синхронизировать список USDT-пар (M10)
bash services/market-data/run.sh catalog

# 4. Загрузить историю 1m свечей (M11)
#    limit = сколько пар загрузить (для теста начните с 3)
bash services/market-data/run.sh backfill 3

# 4b. Популярные монеты + расширение периода (рекомендуется)
bash scripts/load-market-data.sh 30
# или свои монеты:
bash scripts/load-market-data.sh 60 "BTCUSDT,ETHUSDT,XRPUSDT"

# 5. Обновить новые свечи (M12)
bash services/market-data/run.sh live

# 6. Непрерывное обновление каждые 60 сек
bash services/market-data/run.sh live-loop
```

## Модули

| Скрипт | Модуль | Что делает |
|--------|--------|------------|
| `sync/catalog.py` | M10 | Список USDT-пар с историей ≥365 дней |
| `sync/historical.py` | M11 | Загрузка 1m свечей (chunked, checkpoint) |
| `sync/live_sync.py` | M12 | Только новые свечи |

## Проверено

- Binance Futures API: **530 USDT perpetual pairs**
- BTCUSDT история с **2019-09-08**

## Важно

- Бэктестер **никогда** не обращается к Binance — только к нашей БД
- Повторная загрузка безопасна: `ON CONFLICT DO NOTHING`
- При сбое — checkpoint позволяет продолжить
