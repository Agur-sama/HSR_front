# Production Deploy

This setup runs the app with Docker Compose:

- Caddy publishes ports `80` and `443` and issues HTTPS certificates.
- Frontend is built by Vite and served by nginx.
- Backend runs Django through gunicorn.
- PostgreSQL data, Caddy certificates, and Django static files are stored in Docker volumes.

## Server Requirements

- Ubuntu 22.04/24.04 VPS
- Docker and Docker Compose plugin
- Domain DNS `A` record pointing to the server IP
- Open firewall ports `80` and `443`

## First Deploy

```bash
git clone -b wth https://github.com/Agur-sama/HSR_front.git
cd HSR_front
cp .env.example .env
nano .env
docker compose -f docker-compose.prod.yml up -d --build
```

Replace `example.com`, passwords, and `DJANGO_SECRET_KEY` in `.env` before starting. `APP_DOMAIN` is the domain Caddy publishes, for example `vsm-simulator.ru`.

Generate a secret key on the server:

```bash
openssl rand -base64 48
```

## Update Deploy

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Useful Commands

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```
