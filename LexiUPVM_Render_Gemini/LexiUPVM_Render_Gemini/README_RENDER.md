# LexiUPVM + LexiBot con Gemini listo para Render

Este proyecto está preparado para publicarse en Render y obtener un enlace público.

## Archivos importantes

- `index.html`: plataforma LexiUPVM con chat integrado.
- `server.js`: servidor Node.js/Express que conecta con Gemini.
- `package.json`: dependencias y comando de inicio.
- `.env.example`: ejemplo para pruebas locales.
- `render.yaml`: configuración opcional para Render.

## Variables de entorno en Render

En Render agrega estas variables:

```env
GEMINI_API_KEY=TU_CLAVE_DE_GOOGLE_AI_STUDIO
GEMINI_MODEL=gemini-2.5-flash
```

No subas tu archivo `.env` a GitHub.

## Configuración manual en Render

- Build Command: `npm install`
- Start Command: `npm start`
- Runtime/Environment: Node

Cuando Render termine, abrirá una URL parecida a:

`https://lexiupvm-gemini.onrender.com`

Ese será el enlace que puedes compartir para la evaluación.
