# Bus 8 y 25 · Málaga

PWA para ver las paradas más cercanas de las líneas 8 y 25 de la EMT de Málaga, con mapa, posición GPS de los
autobuses y tiempos de llegada.

## Datos

| Qué | De dónde |
| --- | --- |
| Líneas y paradas | Datos abiertos del Ayuntamiento de Málaga (`datosabiertos.malaga.eu`) |
| Posición GPS de los buses y tiempos de llegada | API de `navega.emtmalaga.es`, la misma que usa la web de EMT (no documentada, puede cambiar) |

Si la API de EMT falla, las posiciones vuelven a los datos abiertos del Ayuntamiento (solo dan la última parada).

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
