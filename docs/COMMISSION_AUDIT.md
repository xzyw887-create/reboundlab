# Аудит комиссий — BackTest Pro / ReboundLab

> Обновлено: 2026-07-18. Модель: **taker 0.05%** на каждый fill (открытие, усреднение, закрытие).

## Как считаем сейчас

| Событие | Формула | Пример |
|---------|---------|--------|
| Открытие | `notional × fee_rate` | $1000 × 0.0005 = **$0.50** |
| Усреднение | то же на каждую ногу | 3 ноги → 3 комиссии |
| Закрытие (TP/SL/трейлинг) | `qty × exit_price × fee_rate` | $1000 × 0.0005 = **$0.50** |
| Funding | реальные ставки Binance 8ч из БД | long платит при rate > 0 |

**Net PnL сделки** = gross PnL − `fees_paid` − `funding_paid`.

Код: `backtester/core/margin.py` → `calc_fee`, симуляторы `single_coin.py` / `multi_coin.py`.

## Сравнение с биржами (USDT-M Futures)

| Параметр | BackTest Pro | Binance (стандарт) | Bybit (стандарт) |
|----------|--------------|--------------------|------------------|
| Taker | **0.05%** | 0.05% | ~0.055% |
| Maker | не моделируем (вход по рынку) | 0.02% | ~0.02% |
| Комиссия с BNB/VIP | нет | ниже при VIP | ниже при VIP |
| Funding | история из API | 8ч | 8ч |

**Вывод:** для стратегий «вход по падению = market» модель **0.05% taker** близка к реальности Binance.

## Что ещё не учтено (не блокер MVP)

- Maker-ордера и post-only
- Скидки VIP / BNB
- Slippage (проскальзывание)
- Разница mark price vs last price на funding

## Чеклист ручной сверки (для владельца)

1. Экспорт 1–2 реальных сделок с Binance Futures (время, qty, avg price, fee USDT).
2. Прогон того же периода в BackTest Pro (те же %, TP, усреднения).
3. Сравнить: число fills, gross PnL, сумма fees, funding.
4. Расхождение > 2% — записать в этот файл с причиной.

## Автотесты

```bash
python3 -m pytest backtester/tests/test_fees.py -q
```
