# LexiUPVM v3 + LexiBot UPVM + Gemini

## Ejecutar localmente
1. Instala Node.js LTS.
2. Copia `.env.example` y renómbralo a `.env`.
3. Pega tu clave en `GEMINI_API_KEY`.
4. Ejecuta:

```bash
npm install
npm start
```

5. Abre:

```text
http://localhost:3000
```

## Subir a Render
Sube estos archivos a la raíz del repositorio:

- `index.html`
- `server.js`
- `package.json`
- `render.yaml`
- `prompts/lexibot_v3.md`

En Render configura:

Build Command:

```bash
npm install
```

Start Command:

```bash
npm start
```

Environment Variables:

```env
GEMINI_API_KEY=TU_CLAVE
GEMINI_MODEL=gemini-2.5-flash
```

## Notas
- El prompt no está en el HTML. Está en `prompts/lexibot_v3.md` y lo lee el backend.
- La API Key nunca debe subirse a GitHub.
- El plan gratuito de Render puede dormir el servidor por inactividad.
