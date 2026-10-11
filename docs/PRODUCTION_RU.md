# Production в РФ — backtestpro.ru (вариант 2)

Пошагово: **REG.RU домен + Timeweb Cloud (БД + сервер)** — без Neon/Railway, если они блокируют доступ из РФ.

---

## Что получится

```
backtestpro.ru  →  Timeweb Cloud (Docker: Next.js + Python)
                      ↓
                 Timeweb PostgreSQL (users, подписки, свечи)
```

---

## Часть A — PostgreSQL на Timeweb (~15 мин)

### A1. Регистрация

1. [timeweb.cloud](https://timeweb.cloud) → регистрация (email или Telegram)
2. Пополнить баланс от ~300–500 ₽ (хватит на старт)

### A2. Создать кластер PostgreSQL

1. **Базы данных** → **Создать** → **PostgreSQL**
2. Параметры:
   - Версия: **15** или **16**
   - Регион: **Москва** или **СПб**
   - Тариф: минимальный для старта
3. Запомните **логин, пароль, хост, порт, имя БД**

### A3. Доступ с вашего Mac (для миграции)

1. В карточке БД → **Доступ** / **Firewall**
2. Добавьте **ваш текущий IP** (Google: «мой ip»)
   - Или временно «все IP» только на время настройки, потом закройте
3. Скопируйте строку подключения, вид:

```
postgresql://USER:PASSWORD@HOST:5432/default_db
```

### A4. Применить схемы с Mac

```bash
cd ~/Projects/reboundlab

export DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/default_db'

# Таблицы users, plans, subscriptions, history…
npm run db:migrate:neon

# (Опционально) 3 монеты × 30 дней для бэктеста в облаке
bash scripts/demo-cloud-setup.sh 30
```

Если `npm run db:migrate:neon` выдал **Done** — база готова.

> Скрипт `apply-neon.js` работает с **любым** PostgreSQL, название «neon» — историческое.

---

## Часть B — Сервер приложения на Timeweb (~30 мин)

### B1. Cloud Server (VPS)

1. **Облачные серверы** → **Создать**
2. Рекомендация для старта:
   - **2 vCPU, 4 GB RAM** (бэктест + Next.js)
   - OS: **Ubuntu 22.04**
   - Регион: тот же, что БД
3. SSH-ключ или пароль root — сохраните

### B2. Подключиться по SSH

```bash
ssh root@IP_ВАШЕГО_СЕРВЕРА
```

### B3. Установить Docker на сервере

```bash
apt update && apt install -y git curl
curl -fsSL https://get.docker.com | sh
```

### B4. Клонировать проект на сервер

```bash
git clone https://github.com/ВАШ_АККАУНТ/reboundlab.git /opt/reboundlab
cd /opt/reboundlab
```

Если репозиторий только локально — залейте на **GitHub** (private) или скопируйте через `scp`:

```bash
# с Mac:
scp -r ~/Projects/reboundlab root@IP_СЕРВЕРА:/opt/reboundlab
```

### B5. Файл `.env` на сервере

```bash
cd /opt/reboundlab
nano .env
```

Содержимое:

```env
NODE_ENV=production
PROJECT_ROOT=/opt/reboundlab
PORT=8080

DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/default_db

JWT_SECRET=СГЕНЕРИРУЙТЕ_openssl_rand_hex_32

NEXT_PUBLIC_APP_URL=https://backtestpro.ru
NEXT_PUBLIC_SUPPORT_EMAIL=support@backtestpro.ru
NEXT_PUBLIC_TELEGRAM_URL=
```

На Mac сгенерировать JWT:

```bash
openssl rand -hex 32
```

### B6. Сборка и запуск Docker

На сервере:

```bash
cd /opt/reboundlab
docker build -f deploy/docker/Dockerfile.web -t backtestpro-web .
docker run -d --name backtestpro --restart unless-stopped \
  --env-file .env \
  -p 8080:8080 \
  backtestpro-web
```

Проверка на сервере:

```bash
curl -sS http://127.0.0.1:8080/api/health
```

### B7. PostgreSQL: разрешить сервер приложения

В Timeweb → БД → Firewall добавьте **IP cloud-сервера** (не только Mac).

---

## Часть C — Домен backtestpro.ru → сервер

### C1. Узнать IP сервера

Timeweb → ваш Cloud Server → **Публичный IPv4**

### C2. DNS в REG.RU

1. [reg.ru](https://www.reg.ru) → **backtestpro.ru** → **DNS-серверы и управление**
2. Если DNS у REG.RU (стандартные ns.reg.ru):

| Тип | Subdomain | Значение |
|-----|-----------|----------|
| **A** | `@` | IP сервера |
| **A** | `www` | IP сервера |

TTL: 300–3600. Сохранить.

Ожидание: **15 мин – 24 ч** (обычно < 1 ч).

### C3. HTTPS (Let's Encrypt)

На сервере установите **Caddy** или **nginx + certbot**.

**Простой вариант — Caddy:**

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

cat >/etc/caddy/Caddyfile <<'EOF'
backtestpro.ru, www.backtestpro.ru {
    reverse_proxy localhost:8080
}
EOF

systemctl reload caddy
```

Caddy сам получит SSL-сертификат.

---

## Часть D — Проверка

| URL | Ожидание |
|-----|----------|
| `https://backtestpro.ru/api/health` | `{"ok":true,...}` |
| `/register` | форма регистрации |
| `/app` | терминал (после входа) |
| `/account` | Trial 3 дня |

---

## Часть E — Почта support@backtestpro.ru (позже)

REG.RU → **Почта на домене** → создать ящик `support@backtestpro.ru` (~100–200 ₽/мес).

Пока можно указать личный email в `NEXT_PUBLIC_SUPPORT_EMAIL` и сменить после.

---

## Обновление сайта (деплой новой версии)

```bash
ssh root@IP_СЕРВЕРА
cd /opt/reboundlab
git pull
docker build -f deploy/docker/Dockerfile.web -t backtestpro-web .
docker stop backtestpro && docker rm backtestpro
docker run -d --name backtestpro --restart unless-stopped \
  --env-file .env -p 8080:8080 backtestpro-web
```

---

## Альтернативы Timeweb

| Провайдер | БД | Сервер |
|-----------|-----|--------|
| **Selectel** | Managed PostgreSQL | Cloud VPS |
| **REG.RU VPS** | Postgres в Docker на том же VPS | VPS |
| **Beget** | MySQL только — **не подходит** | VPS + свой Postgres |

---

## Чеклист

- [ ] Timeweb PostgreSQL создан
- [ ] `npm run db:migrate:neon` с Mac — успех
- [ ] Cloud Server 4 GB RAM
- [ ] Docker контейнер `/api/health` OK
- [ ] A-запись `@` и `www` → IP сервера
- [ ] HTTPS (Caddy)
- [ ] Регистрация + бэктест работают

---

## Стоимость (ориентир)

| Статья | ~₽/мес |
|--------|--------|
| Домен .ru | уже куплен |
| PostgreSQL Timeweb | 300–700 |
| VPS 2/4 GB | 500–1200 |
| **Итого** | **~800–2000 ₽/мес** |

---

## Связанные файлы

- `deploy/docker/Dockerfile.web` — образ приложения
- `scripts/production.env.example` — переменные
- `docs/PRODUCTION_LAUNCH.md` — вариант Neon + Railway (если доступ откроется)
