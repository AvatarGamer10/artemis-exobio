# ARTEMIS — Compañero de Exobiología para Elite Dangerous

App de escritorio (Electron + React) que lee el journal de Elite Dangerous: Odyssey en
tiempo real y te asiste en todo el flujo de exobiología, con overlay para jugar y
ventana completa para planificar.

![version](https://img.shields.io/badge/version-0.6.0-orange) ![platform](https://img.shields.io/badge/platform-Windows-blue)

## Características

- **Sistema**: mapa lineal de los cuerpos escaneados (bio en verde), señales biológicas
  por cuerpo, checklist de géneros con distancia de colonia clonal.
- **Predicción de especies**: al escanear un cuerpo, cruza atmósfera, temperatura,
  gravedad, clase y vulcanismo contra las condiciones de ~90 especies y te dice qué
  puede haber y cuánto vale — antes de aterrizar. Se filtra sola tras el DSS.
- **Contexto online**: EDSM (¿sistema virgen? → posible first discovery) y Canonn
  (bio ya reportada por la comunidad) en cada salto.
- **Objetivos**: buscador Spansh de cuerpos con especies premium (≥9M cr) cerca de tu
  posición, con botón para copiar el sistema y plotear.
- **Asistente de muestreo**: dial radial estilo Genetic Sampler con la distancia de
  colonia en vivo desde Status.json, y aviso visual y sonoro al salir del radio.
- **Cartera**: valor sin vender, aviso de pérdida al morir, estimación de first logged (x5).
- **Biblioteca**: registro permanente y buscable de todo lo muestreado.
- **Alertas sonoras**: muestra completada, fanfarria de premio gordo (≥15M), radio de
  colonia superado, combustible bajo. Sintetizadas, sin archivos de audio.
- **Inara**: perfil de CMDR con rangos y progreso (API key personal).
- **Overlay** siempre encima (`Ctrl+Alt+O` mostrar/ocultar, `Ctrl+Alt+M` clics
  atraviesan) + ventana completa. Tema personalizable (color de acento, opacidad),
  idioma ES/EN, tour de bienvenida.

## Instalación

Descarga `Artemis-Setup-<versión>.exe` desde
[Releases](https://github.com/AvatarGamer10/artemis-exobio/releases) y ejecútalo.
Instalación de un clic; no requiere Node.

La app comprueba al arrancar si hay una versión nueva en Releases y ofrece
descargarla e instalarla automáticamente.

## Desarrollo

```
npm install
npm run dev        # arranca la app
npm run simulate   # genera un journal falso en sim-journal/ para probar sin el juego
```

Con `npm run dev` activo, `http://localhost:5173/index.html` muestra la UI con datos
de ejemplo en un navegador normal (añade `?tour=1` para ver el asistente de bienvenida).

## Instalador

```
npm run dist
```

Genera `dist/Artemis-Setup-<versión>.exe` (NSIS, sin firma).

## Notas

- El overlay requiere el juego en modo **Borderless**, no pantalla completa exclusiva.
- Los valores de especies y las reglas de predicción provienen de datos de la
  comunidad (Canonn/Bioforge/Spansh) y son estimaciones.
- El "first footfall" real no está disponible en ninguna API pública; el proxy usado
  es "sistema sin registrar en EDSM".
