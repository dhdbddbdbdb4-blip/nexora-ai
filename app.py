
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pathlib import Path
import pandas as pd
import io, os, sqlite3, json, re, requests, uuid
from datetime import datetime

BASE = Path(__file__).parent
DATA = BASE / "data"
DATA.mkdir(exist_ok=True)
DB = DATA / "app.db"

app = FastAPI(title="Nexora AI")
app.mount("/static", StaticFiles(directory=BASE / "static"), name="static")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
AI_BASE_URL = os.getenv("AI_BASE_URL", "").rstrip("/")
AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "")

def db():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c

c = db()
c.execute("""CREATE TABLE IF NOT EXISTS projects(
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 data_json TEXT NOT NULL
)""")
c.commit()
c.close()

def ai_chat(prompt, system="You are Nexora AI, a helpful assistant. Answer in Russian."):
    if AI_BASE_URL and AI_API_KEY and AI_MODEL:
        r = requests.post(
            f"{AI_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {AI_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": AI_MODEL,
                "messages": [{"role":"system","content":system},{"role":"user","content":prompt}],
                "temperature": 0.25
            },
            timeout=180
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()

    r = requests.post(
        f"{OLLAMA_URL}/api/chat",
        json={
            "model": OLLAMA_MODEL,
            "messages": [{"role":"system","content":system},{"role":"user","content":prompt}],
            "stream": False,
            "options": {"temperature": 0.25}
        },
        timeout=240
    )
    r.raise_for_status()
    data = r.json()
    return data.get("message", {}).get("content", "").strip()

TABLE_SCHEMA = {
    "type": "object",
    "properties": {
        "columns": {"type": "array", "items": {"type": "string"}},
        "rows": {
            "type": "array",
            "items": {
                "type": "array",
                "items": {"type": ["string","number","boolean","null"]}
            }
        }
    },
    "required": ["columns", "rows"]
}

def ai_json(prompt, system):
    if AI_BASE_URL and AI_API_KEY and AI_MODEL:
        r = requests.post(
            f"{AI_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {AI_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": AI_MODEL,
                "messages": [{"role":"system","content":system},{"role":"user","content":prompt}],
                "temperature": 0.1,
                "response_format": {"type":"json_schema","json_schema":{"name":"table_result","schema":TABLE_SCHEMA}}
            },
            timeout=240
        )
        r.raise_for_status()
        raw = r.json()["choices"][0]["message"]["content"]
    else:
        r = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": [{"role":"system","content":system},{"role":"user","content":prompt}],
                "stream": False,
                "format": TABLE_SCHEMA,
                "options": {"temperature": 0.1}
            },
            timeout=300
        )
        r.raise_for_status()
        raw = r.json().get("message",{}).get("content","")
    return normalize_table(json.loads(clean_json(raw)))

def clean_json(s):
    s = s.strip()
    s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.I)
    s = re.sub(r"\s*```$", "", s)
    a, b = s.find("{"), s.rfind("}")
    if a >= 0 and b > a:
        s = s[a:b+1]
    s = re.sub(r",\s*([}\]])", r"\1", s)
    return s

def scalar(v):
    if v is None:
        return ""
    if isinstance(v, dict):
        if "value" in v: return scalar(v["value"])
        if len(v) == 1: return scalar(next(iter(v.values())))
        return "; ".join(f"{k}: {scalar(x)}" for k,x in v.items())
    if isinstance(v, list):
        return ", ".join(scalar(x) for x in v)
    return v

def normalize_table(data):
    cols = [str(scalar(x)) for x in data.get("columns", [])]
    if not cols:
        cols = ["Колонка 1"]
    rows = []
    for row in data.get("rows", []):
        row = [scalar(x) for x in (row if isinstance(row,list) else [row])]
        row += [""] * max(0, len(cols)-len(row))
        rows.append(row[:len(cols)])
    return {"columns": cols, "rows": rows}

class ChatRequest(BaseModel):
    prompt: str
    history: list[dict] = []

class TableRequest(BaseModel):
    prompt: str

class TransformRequest(BaseModel):
    instruction: str
    columns: list[str]
    rows: list[list]

class ProjectRequest(BaseModel):
    name: str
    columns: list[str]
    rows: list[list]
    project_id: str | None = None

@app.get("/", response_class=HTMLResponse)
def index():
    return FileResponse(BASE/"static"/"index.html")

@app.get("/api/health")
def health():
    result = {"app": True, "ai": False, "provider": "none", "model": ""}
    if AI_BASE_URL and AI_API_KEY and AI_MODEL:
        result.update(ai=True, provider="cloud", model=AI_MODEL)
        return result
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=3)
        result.update(ai=r.ok, provider="ollama", model=OLLAMA_MODEL)
    except Exception:
        pass
    return result

@app.post("/api/ai/chat")
def chat(req: ChatRequest):
    try:
        messages = req.history[-12:]
        context = "\n".join(
            f"{m.get('role','user')}: {m.get('content','')}" for m in messages
        )
        prompt = (f"Previous conversation:\n{context}\n\n" if context else "") + req.prompt
        answer = ai_chat(prompt, """You are the friendly AI assistant inside Nexora AI.
You can simply chat, explain things, brainstorm, help with school/work, write text, calculate,
analyze ideas, and also help with spreadsheets. If the user is just talking, do NOT create JSON
and do NOT create a table unless they ask. Answer naturally in Russian.""")
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(503, f"AI недоступен: {e}")

@app.post("/api/ai/table")
def make_table(req: TableRequest):
    try:
        return ai_json(req.prompt, """Create a useful spreadsheet from the user's request.
Return ONLY the requested JSON structure. Every cell must be a simple string, number, boolean or null.
Do not put objects inside cells. Do not use markdown.""")
    except Exception as e:
        raise HTTPException(503, f"Не удалось создать таблицу: {e}")

@app.post("/api/ai/transform")
def transform(req: TransformRequest):
    try:
        csv = pd.DataFrame(req.rows, columns=req.columns).to_csv(index=False)
        return ai_json(
            f"Instruction: {req.instruction}\n\nExisting spreadsheet CSV:\n{csv}",
            """Edit the existing spreadsheet according to the instruction.
Return ONLY JSON. Keep all useful information. Every cell must be a scalar value, never an object."""
        )
    except Exception as e:
        raise HTTPException(503, f"Не удалось изменить таблицу: {e}")

@app.post("/api/ai/report")
def report(req: ChatRequest):
    try:
        return {"report": ai_chat(req.prompt, """Write a polished Russian report.
Use a title, introduction, sections, conclusion and recommendations. Do not use JSON.""")}
    except Exception as e:
        raise HTTPException(503, f"Не удалось создать доклад: {e}")

@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    raw = await file.read()
    try:
        name = file.filename or "table"
        if name.lower().endswith(".csv"):
            df = pd.read_csv(io.BytesIO(raw))
        elif name.lower().endswith((".xlsx",".xls")):
            df = pd.read_excel(io.BytesIO(raw))
        else:
            raise HTTPException(400, "Поддерживаются CSV и Excel (.xlsx/.xls)")
        df = df.fillna("")
        return {"name": Path(name).stem, "columns": [str(x) for x in df.columns], "rows": df.astype(str).values.tolist()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Ошибка файла: {e}")

@app.get("/api/projects")
def projects():
    c=db()
    rows=c.execute("SELECT id,name,created_at,updated_at FROM projects ORDER BY updated_at DESC").fetchall()
    c.close()
    return [dict(x) for x in rows]

@app.get("/api/projects/{pid}")
def get_project(pid: str):
    c=db(); r=c.execute("SELECT * FROM projects WHERE id=?", (pid,)).fetchone(); c.close()
    if not r: raise HTTPException(404, "Проект не найден")
    return {"id":r["id"],"name":r["name"],**json.loads(r["data_json"])}

@app.delete("/api/projects/{pid}")
def delete_project(pid: str):
    c=db(); c.execute("DELETE FROM projects WHERE id=?", (pid,)); c.commit(); c.close()
    return {"ok":True}

@app.post("/api/projects")
def save_project(req: ProjectRequest):
    pid=req.project_id or str(uuid.uuid4())
    now=datetime.utcnow().isoformat()
    payload=json.dumps({"columns":req.columns,"rows":req.rows}, ensure_ascii=False)
    c=db()
    if req.project_id:
        c.execute("UPDATE projects SET name=?,updated_at=?,data_json=? WHERE id=?", (req.name,now,payload,pid))
    else:
        c.execute("INSERT INTO projects VALUES(?,?,?,?,?)", (pid,req.name,now,now,payload))
    c.commit(); c.close()
    return {"id":pid}

@app.post("/api/export/xlsx")
def export_xlsx(req: ProjectRequest):
    p=DATA/f"{uuid.uuid4()}.xlsx"
    pd.DataFrame(req.rows,columns=req.columns).to_excel(p,index=False,sheet_name="Таблица")
    return FileResponse(p,filename=f"{req.name or 'table'}.xlsx")

@app.post("/api/export/csv")
def export_csv(req: ProjectRequest):
    p=DATA/f"{uuid.uuid4()}.csv"
    pd.DataFrame(req.rows,columns=req.columns).to_csv(p,index=False,encoding="utf-8-sig")
    return FileResponse(p,filename=f"{req.name or 'table'}.csv",media_type="text/csv")

@app.post("/api/export/json")
def export_json(req: ProjectRequest):
    p=DATA/f"{uuid.uuid4()}.json"
    p.write_text(json.dumps({"columns":req.columns,"rows":req.rows},ensure_ascii=False,indent=2),encoding="utf-8")
    return FileResponse(p,filename=f"{req.name or 'table'}.json",media_type="application/json")
