# ARTEMIS â€” CompaÃ±ero de ExobiologÃ­a para Elite Dangerous

App de escritorio (Electron + React) que lee el journal de Elite Dangerous: Odyssey en
tiempo real y te asiste en todo el flujo de exobiologÃ­a, con overlay para jugar y
ventana completa para planificar.

![version](https://img.shields.io/badge/version-0.5.0-orange) ![platform](https://img.shields.io/badge/platform-Windows-blue)

## CaracterÃ­sticas

- **Sistema**: mapa lineal de los cuerpos escaneados (bio en verde), seÃ±ales biolÃ³gicas
  por cuerpo, checklist de gÃ©neros con distancia de colonia clonal.
- **PredicciÃ³n de especies**: al escanear un cuerpo, cruza atmÃ³sfera, temperatura,
  gravedad, clase y vulcanismo contra las condiciones de ~90 especies y te dice quÃ©
  puede haber y cuÃ¡nto vale â€” antes de aterrizar. Se filtra sola tras el DSS.
- **Contexto online**: EDSM (Â¿sistema virgen? â†’ posible first discovery) y Canonn
  (bio ya reportada por la comunidad) en cada salto.
- **Objetivos**: buscador Spansh de cuerpos con especies premium (â‰¥9M cr) cerca de tu
  posiciÃ³n, con botÃ³n para copiar el sistema y plotear.
- **Asistente de muestreo**: progreso 1/3â€“3/3, distancia de colonia en vivo desde
  Status.json, aviso visual y sonoro al salir del radio.
- **Cartera**: valor sin vender, aviso de pÃ©rdida al morir, estimaciÃ³n de first logged (x5).
- **Biblioteca**: registro permanente y buscable de todo lo muestreado.
- **Alertas sonoras**: muestra completada, fanfarria de premio gordo (â‰¥15M), radio de
  colonia superado, combustible bajo. Sintetizadas, sin archivos de audio.
- **Inara**: perfil de CMDR con rangos y progreso (API key personal).
- **Overlay** siempre encima (`Ctrl+Alt+O` mostrar/ocultar, `Ctrl+Alt+M` clics
  atraviesan) + ventana completa. Tema personalizable (color de acento, opacidad),
  idioma ES/EN, tour de bienvenida.

## Desarrollo

```
npm install
npm run dev        # arranca la app
npm run simulate   # genera un journal falso en sim-journal/ para probar sin el juego
```

Con `npm run dev` activo, `http://localhost:5173/index.html` muestra la UI con datos
de ejemplo en un navegador normal (aÃ±ade `?tour=1` para ver el asistente de bienvenida).

## Instalador

```
npm run dist
```

Genera `dist/Artemis-Setup-<versiÃ³n>.exe` (NSIS, sin firma).

## Notas

- El overlay requiere el juego en modo **Borderless**, no pantalla completa exclusiva.
- Los valores de especies y las reglas de predicciÃ³n provienen de datos de la
  comunidad (Canonn/Bioforge/Spansh) y son estimaciones.
- El "first footfall" real no estÃ¡ disponible en ninguna API pÃºblica; el proxy usado
  es "sistema sin registrar en EDSM".
