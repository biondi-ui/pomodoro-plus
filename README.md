# Pomodoro+

Una app web simple de temporizador Pomodoro para enfocarte en tus tareas, con sonidos ambientales y estadísticas diarias.

## Funcionalidades

- ⏱️ Temporizador con modos de **Enfoque**, **Descanso corto** y **Descanso largo**
- 🔊 Sonidos ambientales (lluvia, olas, ruido blanco) generados con Web Audio API, sin archivos externos
- ✅ Lista de tareas con conteo de pomodoros completados por tarea
- 📊 Estadísticas de sesiones, minutos enfocados y racha, guardadas en `localStorage`

## Cómo usarla

No requiere instalación ni dependencias. Solo abrí `index.html` en tu navegador:

```bash
open index.html
```

O servila con cualquier servidor estático, por ejemplo:

```bash
python3 -m http.server 8000
```

y visitá `http://localhost:8000`.

## Estructura

- `index.html` — markup de la app
- `styles.css` — estilos
- `app.js` — lógica del temporizador, tareas, estadísticas y sonido ambiental
