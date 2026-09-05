# Nexora AI

Nexora AI — умное веб-приложение для обычных пользователей и бизнеса.

## Возможности

- 🤖 обычный AI-чат;
- 📊 создание таблиц по промту;
- 🪄 AI-исправление таблиц;
- 📥 Excel/CSV импорт;
- 📤 Excel/CSV/JSON экспорт;
- 💾 проекты в SQLite;
- 📈 аналитика;
- 📝 доклады;
- 🎨 генератор prompt для изображений;
- 📱 адаптивный интерфейс.

## Локальный запуск

```powershell
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
python -m uvicorn app:app --reload
```

## Онлайн AI для Render

Эта версия поддерживает OpenRouter без Ollama на компьютере.

1. Создай API key в OpenRouter.
2. В Render открой свой сервис → **Environment**.
3. Добавь:

```text
OPENROUTER_API_KEY = твой_ключ
OPENROUTER_MODEL = openrouter/free
```

Render использует переменные окружения во время работы сервиса. Не добавляй секретный ключ в GitHub. 

После сохранения Render сделает новый deploy.

`openrouter/free` — бесплатный роутер OpenRouter. На текущем бесплатном тарифе OpenRouter у бесплатных моделей есть лимит 50 запросов в сутки и 20 запросов в минуту; список бесплатных моделей меняется. 

## Production

Для настоящего коммерческого продукта рекомендуется:
- PostgreSQL вместо SQLite;
- постоянное файловое хранилище;
- авторизация;
- ограничения запросов;
- мониторинг;
- HTTPS и собственный домен.

Render выдаёт публичный `onrender.com` адрес для web service и требует, чтобы приложение слушало `0.0.0.0`. 
