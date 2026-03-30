# nastya_diplom

## Запуск через Docker

Приложение использует PostgreSQL в отдельном контейнере `db`. Данные базы теперь хранятся в Docker volume `postgres_data`, а не в локальном файле `university_courses.db`.

### Команды

```bash
docker compose up --build
```

Backend будет доступен на `http://localhost:3400`, frontend на `http://localhost:3420`.

### Переменные окружения для локального запуска backend

Скопируйте `backend/.env.example` в `backend/.env` и при необходимости поменяйте значения под свою локальную PostgreSQL.

## Email-рассылки

Для вкладки массовых email-рассылок backend использует SMTP и реально отправляет письма студентам потока.

### Что нужно настроить в `backend/.env`

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_account@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=your_account@gmail.com
SMTP_FROM_NAME=Факультет компьютерных наук
SMTP_USE_TLS=true
SMTP_USE_SSL=false
```

Для Gmail нужен пароль приложения, а не обычный пароль аккаунта.
