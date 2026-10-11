# Sprinthost — backtestpro.ru (дешевле Timeweb на старте)

**Идея:** один **VPS** вместо «VPS + отдельная облачная БД».

Timeweb часто выходит дороже, потому что **PostgreSQL и сервер оплачиваются отдельно**.  
На Sprinthost можно поднять **Postgres + сайт на одной машине** через Docker.

---

## Какой тариф взять

| Тариф (ориентир) | RAM | Подходит? |
|------------------|-----|-----------|
| Джун / 512 MB–1 GB | мало | ❌ бэктест не потянет |
| **Мидл** ~2 GB | ~790 ₽/мес | ⚠️ только тест, мало памяти |
| **Мидл+** ~4 GB | ~1500 ₽/мес | ✅ **рекомендуем для старта** |
| DBaaS PostgreSQL отдельно | +₽ | можно, но снова два счёта |

Цены смотрите на [sprinthost.ru](https://sprinthost.ru) — они меняются.

**Минимум для BackTest Pro:** **4 GB RAM**, Ubuntu 22.04, KVM.

---

## Шаг 1 — Заказ VPS

1. Sprinthost → **VPS/VDS** → **Мидл+** (4 GB) или аналог  
2. OS: **Ubuntu 22.04**  
3. Запишите **IP** и root-пароль (или SSH-ключ)

---

## Шаг 2 — Залить проект на сервер

**С Mac:**

```bash
rsync -avz --exclude node_modules --exclude .git --exclude .data \
  ~/Projects/reboundlab/ root@IP_СЕРВЕРА:/opt/reboundlab/
```

---

## Шаг 3 — `.env` на сервере

```bash
ssh root@IP_СЕРВЕРА
cd /opt/reboundlab
nano .env
```

Пример:

```env
POSTGRES_PASSWORD=длинный_случайный_пароль
JWT_SECRET=результат_openssl_rand_hex_32
NEXT_PUBLIC_APP_URL=https://backtestpro.ru
NEXT_PUBLIC_SUPPORT_EMAIL=support@backtestpro.ru
```

На Mac: `openssl rand -hex 32`

---

## Шаг 4 — Docker + база + сайт

```bash
apt update && apt install -y docker.io docker-compose-v2 git
cd /opt/reboundlab

docker compose -f deploy/docker/docker-compose.prod.yml up -d --build
```

Миграции (первый раз, из контейнера или с хоста после установки `pg`):

```bash
export DATABASE_URL="postgresql://reboundlab:ВАШ_POSTGRES_PASSWORD@127.0.0.1:5432/reboundlab"
# Проброс порта postgres наружу не нужен — выполните с хоста через docker:
docker compose -f deploy/docker/docker-compose.prod.yml exec postgres \
  psql -U reboundlab -d reboundlab -c "SELECT 1"

# С Mac после временного проброса 5432 ИЛИ one-shot:
docker run --rm --network reboundlab_default \
  -e DATABASE_URL=postgresql://reboundlab:PASSWORD@postgres:5432/reboundlab \
  -v /opt/reboundlab:/app -w /app node:20-bookworm-slim \
  bash -c "npm ci --include-workspace-root && node scripts/migrate/apply-neon.js"
```

Проще: **с Mac** после SSH-туннеля:

```bash
ssh -L 5433:127.0.0.1:5432 root@IP_СЕРВЕРА
# на Mac, если на VPS пробросили postgres:5432:5432 временно — лучше миграция через скрипт на сервере:

cd /opt/reboundlab
apt install -y nodejs npm   # или nvm
npm ci --include-workspace-root
export DATABASE_URL="postgresql://reboundlab:PASSWORD@postgres:5432/reboundlab"
# из сети docker:
docker network ls
docker run --rm --network deploy_default \
  -v /opt/reboundlab:/app -w /app \
  -e DATABASE_URL=postgresql://reboundlab:PASSWORD@postgres:5432/reboundlab \
  node:20-bookworm-slim bash -c "npm ci --include-workspace-root 2>/dev/null; node scripts/migrate/apply-neon.js"
```

**Упростим:** добавьте в `docker-compose.prod.yml` одноразовый `migrate` service — или используйте `scripts/sprinthost-first-boot.sh` (см. ниже).

---

## Шаг 5 — HTTPS + домен

Тот же **Caddy**, что в `scripts/timeweb-server-install.sh`:

```bash
cd /opt/reboundlab
NEXT_PUBLIC_APP_URL=https://backtestpro.ru bash scripts/timeweb-server-install.sh
```

(Скрипт ставит Caddy и проксирует на `127.0.0.1:8080` — контейнер `web` уже слушает там.)

**REG.RU DNS:**

| A | @ | IP VPS |
| A | www | IP VPS |

Отключите **парковку** «сайт приостановлен».

---

## Sprinthost vs Timeweb (старт)

| | Sprinthost | Timeweb |
|---|------------|---------|
| Счёт | часто **1 VPS** | VPS + managed DB |
| Цена старта | **~1500 ₽/мес** (4 GB) | **~2000+ ₽/мес** |
| Админка | привычный RU-хостинг | облако |
| Для backtestpro.ru | ✅ подходит | ✅ подходит |

---

## Демо-свечи (BTC/ETH/SOL)

После миграции, **на сервере** (нужен Python в образе web или отдельно):

```bash
export DATABASE_URL=postgresql://reboundlab:PASSWORD@postgres:5432/reboundlab
bash scripts/demo-cloud-setup.sh 30
```

(Запускать из `/opt/reboundlab` на VPS, где есть Python и доступ к БД.)

---

## Связанные файлы

- `deploy/docker/docker-compose.prod.yml`
- `docs/LAUNCH_NOW.md`
- `scripts/timeweb-server-install.sh` — HTTPS (любой VPS)
