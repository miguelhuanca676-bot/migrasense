# MigraSense — Aplicación web (frontend)

Aplicación web para el registro de síntomas prodrómicos y episodios de migraña,
con predicción de riesgo mediante machine learning.

**Equipo:** Los Backyardigans — UNIVALLE

🌐 **Sitio:** https://migrasense.pages.dev/ (respaldo: https://miguelhuanca676-bot.github.io/migrasense/)

## Arquitectura

```
Navegador (este repositorio, Cloudflare Pages · respaldo GitHub Pages)
   │  HTTPS + token Bearer (Sanctum)
   ▼
API Laravel (Render)  ── TLS ──►  MySQL (Aiven)
   │  X-API-Key (sin nombres ni correos)
   ▼
Servicio de ML (FastAPI, Render)
```

- Este repositorio contiene **solo** HTML, CSS y JavaScript (sin claves ni contraseñas).
- Las cuentas, el cuestionario, los registros y los recordatorios se guardan en la base de datos
  a través de la API. El navegador guarda únicamente una copia temporal y el token de sesión.
- El código del backend y del ML está en el repositorio del proyecto (Proyecto-De-Sistemas).

## Archivos principales

| Archivo | Para qué sirve |
|---|---|
| `js/api.js` | Conexión con la API: token, peticiones, sincronización y errores |
| `js/preguntas.js` | Preguntas del cuestionario (compartidas) |
| `js/auth.js` | Registro e inicio de sesión |
| `js/registro.js` | Registrar síntomas prodrómicos y episodios |
| `js/historial.js` | Historial, gráficos, editar/eliminar y reporte PDF |
| `js/dashboard.js` | Riesgo de migraña (modelo de ML) y patrones |
| `js/perfil.js` | Cuenta, foto, contraseña, cuestionario y recordatorios |

## Notas

- La primera petición después de un rato sin uso puede tardar hasta 1 minuto
  (los servicios gratuitos de Render se “duermen”).
- Para probar con la API en tu computadora, en la consola del navegador:
  `localStorage.setItem('ms_api_url', 'http://127.0.0.1:8000/api')`
  y para volver a la nube: `localStorage.removeItem('ms_api_url')`.

> MigraSense es una herramienta de apoyo: no reemplaza el diagnóstico médico.
