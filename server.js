const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const API_KEY = process.env.GEMINI_API_KEY || '';
const PROMPT_PATH = path.join(__dirname, 'prompts', 'lexibot_v3.md');
const SYSTEM_PROMPT = fs.existsSync(PROMPT_PATH)
  ? fs.readFileSync(PROMPT_PATH, 'utf8')
  : 'Eres LexiBot UPVM. Responde únicamente sobre LexiUPVM y dificultades lectoras. No diagnostiques.';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

const sessions = new Map();
function getSession(id) {
  const safeId = String(id || 'default').slice(0, 120);
  if (!sessions.has(safeId)) sessions.set(safeId, { history: [], context: {}, updatedAt: Date.now() });
  const session = sessions.get(safeId);
  session.updatedAt = Date.now();
  return session;
}
function pruneSessions() {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (now - s.updatedAt > 1000 * 60 * 60 * 3) sessions.delete(id);
  }
}
setInterval(pruneSessions, 1000 * 60 * 20).unref();

function contextToText(context = {}) {
  const lines = [];
  if (context.name) lines.push(`Nombre del usuario: ${context.name}`);
  if (context.age) lines.push(`Edad: ${context.age}`);
  if (context.gender) lines.push(`Género: ${context.gender}`);
  if (context.school) lines.push(`Escolaridad: ${context.school}`);
  if (context.group) lines.push(`Grupo de edad: ${context.group}`);
  if (context.adaptiveLevel) lines.push(`Nivel adaptativo aplicado: ${context.adaptiveLevel}`);
  if (context.result) {
    lines.push(`Resultado estimado: ${context.result.risk || 'No disponible'}`);
    lines.push(`Porcentaje estimado: ${context.result.difficulty || 'No disponible'}%`);
    if (context.result.sections) {
      lines.push(`Áreas: palabras ${context.result.sections.palabras}%, tiempo ${context.result.sections.tiempo}%, corrección ${context.result.sections.correccion}%, comprensión ${context.result.sections.comprension}%.`);
    }
  }
  return lines.length ? lines.join('\n') : 'No hay datos de evaluación registrados todavía.';
}

app.get('/healthz', (req, res) => res.json({ ok: true, service: 'LexiUPVM v3', model: MODEL }));

app.post('/api/context', (req, res) => {
  const { sessionId, context, event } = req.body || {};
  const session = getSession(sessionId);
  session.context = { ...session.context, ...(context || {}) };
  session.lastEvent = event || 'context_update';
  res.json({ ok: true });
});

app.post('/api/reset', (req, res) => {
  const { sessionId } = req.body || {};
  sessions.delete(String(sessionId || 'default').slice(0, 120));
  res.json({ ok: true });
});

app.post('/api/chat', async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY no configurada.' });
    const { sessionId, message, context } = req.body || {};
    const text = String(message || '').trim();
    if (!text) return res.status(400).json({ error: 'Mensaje vacío.' });

    const session = getSession(sessionId);
    session.context = { ...session.context, ...(context || {}) };

    const systemInstruction = `${SYSTEM_PROMPT}\n\nCONTEXTO ACTUAL DE LEXIUPVM:\n${contextToText(session.context)}\n\nRegla adicional: Usa el contexto solo para orientar al usuario; no inventes datos faltantes.`;

    const history = session.history.slice(-12);
    const contents = [
      ...history,
      { role: 'user', parts: [{ text }] }
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(API_KEY)}`;
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: { temperature: 0.45, topP: 0.9, maxOutputTokens: 500 }
      })
    });

    const data = await geminiRes.json().catch(() => ({}));
    if (!geminiRes.ok) {
      console.error('Gemini error:', JSON.stringify(data).slice(0, 1200));
      return res.status(502).json({ error: data?.error?.message || 'Gemini no respondió correctamente.' });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n').trim() || 'No cuento con información suficiente para responder esa pregunta.';
    session.history.push({ role: 'user', parts: [{ text }] });
    session.history.push({ role: 'model', parts: [{ text: reply }] });
    session.history = session.history.slice(-16);
    res.json({ reply });
  } catch (err) {
    console.error('Server chat error:', err);
    res.status(500).json({ error: 'Error interno al procesar el mensaje.' });
  }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => {
  console.log('============================================');
  console.log(`LexiUPVM v3 listo: http://localhost:${PORT}`);
  console.log(API_KEY ? 'Gemini API Key detectada.' : 'Falta GEMINI_API_KEY en .env o Render.');
  console.log(`Modelo: ${MODEL}`);
  console.log('============================================');
});
