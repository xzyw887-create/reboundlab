# Backtester Engine

Движок расчёта стратегий на одной монете (M14, M15, M17).

## Что умеет

- Вход по **падению %** за окно N минут (1m тики)
- **Кросс-маржа**, плечо, вход % от депозита
- **Take Profit** и **Stop Loss**
- **Трейлинг** (активация Y%, откат N% от пика)
- **Усреднения** до 3 уровней (пресеты + свои)
- **Комиссии** и **funding** каждые 8 часов
- **Ликвидация** → баланс = 0, все сделки стоп

## Быстрый запуск (демо)

```bash
cd /Users/wasya8/Projects/reboundlab
PYTHONPATH=. python3 backtester/run.py
```

## С параметрами

```bash
PYTHONPATH=. python3 backtester/run.py \
  --deposit 1000 \
  --entry-pct 10 \
  --leverage 5 \
  --drop-pct 3 \
  --window 60 \
  --tp 2 \
  --trailing
```

## С реальными данными из БД

```bash
PYTHONPATH=. python3 backtester/run.py --symbol BTCUSDT
```

## Тесты

```bash
PYTHONPATH=. python3 -m pytest backtester/tests/ -v
```

## Пресеты усреднений

| Пресет | Уровни (падение% / вход% депозита) |
|--------|-------------------------------------|
| conservative | 3/5%, 6/5%, 10/5% |
| balanced | 5/10%, 10/10%, 15/10% |
| aggressive | 8/15%, 15/15%, 25/15% |

## Структура

```
backtester/
├── core/          # params, types, margin math
├── strategies/    # entry, trailing, averaging
├── simulators/    # single_coin.py (main engine)
├── tests/         # unit tests
└── run.py         # CLI
```
