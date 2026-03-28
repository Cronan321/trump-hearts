# Trump Hearts — Backend

FastAPI backend for the Trump Hearts multiplayer card game.

## Requirements

- Python 3.11+
- PostgreSQL 15+

## Setup

### 1. Create and activate a virtual environment

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in your DATABASE_URL and SECRET_KEY
```

### 4. Run database migrations

```bash
alembic upgrade head
```

### 5. Start the development server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

## Project Structure

```
backend/
├── app/
│   ├── api/        # REST route handlers
│   ├── engine/     # Game engine logic
│   ├── models/     # SQLAlchemy ORM models & Pydantic schemas
│   ├── services/   # Business logic services (auth, lobby, etc.)
│   ├── ws/         # WebSocket connection managers
│   ├── config.py   # Settings loaded from .env
│   └── main.py     # FastAPI app entry point
├── alembic/        # Database migration scripts
├── .env.example    # Environment variable template
├── pyproject.toml
└── requirements.txt
```
