# Старт сейчас — backtestpro.ru

Делайте **по порядку**. Отмечайте галочки.

---

## Шаг 1 — Timeweb PostgreSQL (вы в браузере)

1. [timeweb.cloud](https://timeweb.cloud) → вход / регистрация  
2. Баланс **+500 ₽**  
3. **Базы данных** → **PostgreSQL** → создать (PG 15/16, Москва)  
4. **Доступ** → добавить **ваш IP** (запрос «мой ip» в Google)  
5. Скопировать **строку подключения**

---

## Шаг 2 — Миграция (на Mac)

```bash
cd ~/Projects/reboundlab
export DATABASE_URL='postgresql://...из Timeweb...'
bash scripts/setup-production-db.sh --with-demo-candles
```

Без демо-свечей (только аккаунты):

```bash
bash scripts/setup-production-db.sh
```

---

## Шаг 3 — VPS Timeweb

1. **Облачные серверы** → Ubuntu 22.04, **2 CPU / 4 GB RAM**  
2. Записать **IP** и пароль root  
3. В PostgreSQL firewall добавить **IP сервера**

---

## Шаг 4 — Код на сервер

**С Mac** (замените IP):

```bash
rsync -avz --exclude node_modules --exclude .git \
  ~/Projects/reboundlab/ root@IP_СЕРВЕРА:/opt/reboundlab/
```

**На сервере** создать `/opt/reboundlab/.env`:

```env
NODE_ENV=production
PROJECT_ROOT=/opt/reboundlab
PORT=8080
DATABASE_URL=postgresql://...как в шаге 2...
JWT_SECRET=...openssl rand -hex 32...
NEXT_PUBLIC_APP_URL=https://backtestpro.ru
NEXT_PUBLIC_SUPPORT_EMAIL=support@backtestpro.ru
```

**На сервере:**

```bash
cd /opt/reboundlab
bash scripts/timeweb-server-install.sh
```

---

## Шаг 5 — DNS REG.RU

| Тип | Имя | Значение |
|-----|-----|----------|
| A | @ | IP VPS |
| A | www | IP VPS |

Уберите/отключите **парковку** REG.RU, если сайт «приостановлен».

---

## Шаг 6 — Проверка

- https://backtestpro.ru/api/health  
- https://backtestpro.ru/register  
- https://backtestpro.ru/app  

---

Подробности: `docs/PRODUCTION_RU.md`
