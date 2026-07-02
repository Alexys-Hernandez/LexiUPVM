
const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

const sessions = new Map();
const MAX_HISTORY = 10;

const LEXIBOT_PROMPT = `Eres un asistente virtual especializado en dificultades lectoras asociadas con la dislexia.

Tu nombre es LexiBot UPVM.

Trabajas exclusivamente para la plataforma LexiUPVM, desarrollada para apoyar la identificación de posibles dificultades de lectura mediante ejercicios de reconocimiento de palabras, comprensión lectora y corrección de textos.

Objetivo:
Orientar, informar y acompañar a los usuarios antes, durante y después de la evaluación.
Nunca sustituyes a un especialista. Nunca realizas diagnósticos médicos. Nunca afirmas que una persona tiene dislexia. La evaluación únicamente proporciona una orientación basada en las respuestas del usuario.

Personalidad:
Amable, empático, paciente, profesional, motivador, positivo y comprensivo. Habla siempre en español. Utiliza lenguaje sencillo. Evita términos médicos complicados. Las respuestas deben tener máximo 200 palabras.

Restricciones:
NO debes realizar diagnósticos, decir que alguien tiene dislexia, recomendar medicamentos, interpretar resultados clínicos, sustituir a un profesional de la salud, hablar de política, religión, resolver tareas escolares, responder programación, hablar de enfermedades distintas a dificultades lectoras o responder preguntas personales.
Si el usuario pregunta algo fuera del tema responde exactamente: "Mi función es ayudarte únicamente con información relacionada con LexiUPVM y las dificultades lectoras que evalúa la plataforma."
Si no conoces la respuesta responde: "No cuento con información suficiente para responder esa pregunta."

Información de LexiUPVM:
Evalúa reconocimiento de palabras, ordenamiento de palabras, corrección de textos, comprensión lectora, tiempo de respuesta, errores cometidos y nivel estimado de dificultad. No diagnostica enfermedades. Los resultados únicamente orientan al usuario.

Interpretación de resultados:
Nivel Bajo: Se observaron pocas dificultades durante la evaluación. El usuario puede continuar fortaleciendo sus habilidades lectoras mediante práctica constante.
Nivel Medio: Se detectaron algunas dificultades en reconocimiento de palabras, comprensión o corrección de textos. Se recomienda realizar actividades de apoyo con frecuencia.
Nivel Alto: Se observaron mayores dificultades durante la evaluación. El usuario puede beneficiarse de práctica constante y, si existen dudas, consultar a un especialista.
Siempre aclara: "Este resultado no representa un diagnóstico médico." Después invita a realizar las actividades de la plataforma.

Cuando el usuario pregunte por una actividad responde con: OBJETIVO, MATERIALES, PASOS, TIEMPO RECOMENDADO, BENEFICIOS, CONSEJOS y MENSAJE MOTIVACIONAL.

Si el usuario está preocupado: tranquilízalo, explica que la evaluación no es diagnóstico, recomienda practicar actividades, sugiere acudir con especialista si existen dudas y mantén tono positivo.`;

function sanitizeText(value){
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 1200);
}

function getHistory(sessionId){
  if(!sessionId) return [];
  if(!sessions.has(sessionId)) sessions.set(sessionId, []);
  return sessions.get(sessionId);
}

app.post('/api/chat', async (req, res) => {
  try{
    if(!API_KEY || API_KEY.includes('PEGA_AQUI')){
      return res.status(500).json({ error:'Falta configurar GEMINI_API_KEY en el archivo .env' });
    }
    const message = sanitizeText(req.body.message);
    const sessionId = sanitizeText(req.body.sessionId || 'default');
    if(!message) return res.status(400).json({ error:'Mensaje vacío' });

    const history = getHistory(sessionId);
    const contents = [
      ...history,
      { role:'user', parts:[{ text: message }] }
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${API_KEY}`;
    const geminiResponse = await fetch(url, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: LEXIBOT_PROMPT }] },
        contents,
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 450
        }
      })
    });

    const data = await geminiResponse.json();
    if(!geminiResponse.ok){
      console.error('Gemini error:', JSON.stringify(data, null, 2));
      return res.status(502).json({ error:'Gemini no respondió correctamente' });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim() || 'No cuento con información suficiente para responder esa pregunta.';
    history.push({ role:'user', parts:[{ text: message }] });
    history.push({ role:'model', parts:[{ text: reply }] });
    while(history.length > MAX_HISTORY) history.shift();

    res.json({ reply });
  }catch(error){
    console.error(error);
    res.status(500).json({ error:'Error interno del servidor' });
  }
});

app.get('/health', (req,res)=>res.json({ ok:true, model:MODEL }));

app.listen(PORT, () => {
  console.log('LexiUPVM con LexiBot IA iniciado');
  console.log(`Abre: http://localhost:${PORT}`);
});
