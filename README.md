# Nexora AI

Умное рабочее пространство для жизни и бизнеса.

## Возможности

- 🤖 чат с AI для обычного общения, вопросов, идей и помощи;
- 🏠 режим для жизни;
- 💼 режим для бизнеса;
- 📊 создание и редактирование таблиц через AI;
- 📥 импорт CSV/XLSX;
- 📤 экспорт XLSX/CSV/JSON;
- 📈 аналитика;
- 📝 генерация докладов;
- 🎨 генератор промтов изображений;
- 📱 адаптивный интерфейс для телефона.

## Локальный запуск

```powershell
python -m venv .venv
.venv\\Scripts\\activate
python -m pip install -r requirements.txt
python -m uvicorn app:app --reload
```

Открой: http://127.0.0.1:8000

## Ollama

По умолчанию приложение использует локальную Ollama:

```powershell
ollama pull qwen2.5:7b
```

## Публикация через Render

В репозитории уже есть `render.yaml`.

Build Command:

```text
pip install -r requirements.txt
```

Start Command:

```text
uvicorn app:app --host 0.0.0.0 --port $PORT
```

### Важно про AI в облаке

При публикации на Render локальная Ollama с вашего компьютера не переносится на сервер. Для публичного сайта нужно подключить облачный AI API через переменные окружения:

```text
AI_BASE_URL
AI_API_KEY
AI_MODEL
```

## Структура репозитория

```text
Nexora_AI/
├── app.py
├── requirements.txt
├── render.yaml
├── .gitignore
├── README.md
└── static/
    ├── index.html
    ├── app.js
    └── style.css
```
