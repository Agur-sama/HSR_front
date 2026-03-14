# 🚄 HSR Project Simulator (Microservice Architecture)

![React](https://img.shields.io/badge/Frontend-React-blue?logo=react)
![Canvas API](https://img.shields.io/badge/Rendering-Canvas_API-ff69b4)
![Node.js](https://img.shields.io/badge/API_Gateway-Node.js-339933?logo=nodedotjs)
![FastAPI](https://img.shields.io/badge/Sim_Engine-FastAPI-009688?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql)
![Docker](https://img.shields.io/badge/Infra-Docker%20%7C%20K8s-2496ED?logo=docker)

**HSR Project Simulator** — это распределенное веб-приложение для имитационного моделирования процессов управления строительством Высокоскоростных магистралей (ВСМ). 

Проект представляет собой «Serious Game» (обучающий тренажер), где пользователь управляет графиком Ганта, бюджетом и реагирует на динамически генерируемые риски (стохастические события).

---

## 🏗 Архитектура системы

Проект построен на базе **микросервисной архитектуры**, что позволяет разделить бизнес-логику, тяжелые вычисления и клиентский рендеринг.

```mermaid
graph TD
    Client[React.js + Canvas API] <-->|REST / JSON| Gateway(Node.js API Gateway)
    Gateway <-->|Read / Write| DB[(PostgreSQL)]
    Gateway <-->|Simulation Request| Engine(FastAPI Engine)
    Engine <-->|Prompt| AI[LLM / GenAI]