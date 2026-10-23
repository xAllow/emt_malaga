# Bus 8 y 25 · Málaga

PWA para ver las paradas más cercanas de las líneas 8 y 25 de la EMT de Málaga, con mapa, posición GPS de los
autobuses y tiempos de llegada.

## Datos

| Qué | De dónde |
| --- | --- |
| Líneas y paradas | Datos abiertos del Ayuntamiento de Málaga (`datosabiertos.malaga.eu`) |
| Horarios del Metro (L1 y L2) | GTFS oficial de Metro Málaga (`metromalaga.es/GTFS`), convertido a `public/metro.json`. Solo horario programado: Metro Málaga no publica tiempos en tiempo real |
| Posición GPS de los buses y tiempos de llegada | API de `navega.emtmalaga.es`, la misma que usa la web de EMT (no documentada, puede cambiar) |

Si la API de EMT falla, las posiciones vuelven a los datos abiertos del Ayuntamiento (solo dan la última parada).

## Actualizar el horario del Metro

El GTFS solo cubre unas semanas (el actual llega hasta el 19/11/2026). Para renovarlo:

```bash
python scripts/build_metro.py   # descarga el GTFS y regenera public/metro.json
```

Después, commit y push. Sin esto, pasada la fecha la app avisa de que el horario del Metro no está disponible.

## Estructura

- `public/`: la app (`index.html`, `manifest.webmanifest`, `sw.js`, iconos y Leaflet en `vendor/`).
- `api/`: funciones de Vercel que reenvían los datos (los servidores de origen no permiten CORS).
  - `lineas`: paradas ordenadas por línea y sentido.
  - `live`: posición de los buses.
  - `estim?cod=812,819`: tiempos de llegada por parada.
  - `geotrust-tls-rsa-ca-g1.pem`: certificado intermedio que EMT no envía (Node no lo completa solo).
    Caduca en noviembre de 2027; si las peticiones a EMT empiezan a fallar con un error de certificado, hay que renovarlo.
- `dev.js`: servidor local sin Vercel (`npm run dev`, <http://localhost:8081>).

## Instalar en el móvil

Abre la dirección de la app en Chrome (Android) o Safari (iPhone) y elige **Añadir a pantalla de inicio**.
