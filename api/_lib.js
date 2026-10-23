// Utilidades compartidas por las funciones de /api (el guion bajo evita que Vercel las exponga como ruta).
const BASE = 'https://datosabiertos.malaga.eu/recursos/transporte/EMT';
const URL_LINEAS = BASE + '/EMTLineasYParadas/lineasyparadas.geojson';
const URL_LIVE = BASE + '/EMTlineasUbicaciones/lineasyubicaciones.geojson';
const EMT = 'https://navega.emtmalaga.es/api';
const LINEAS = ['8', '25'];
const UA = { 'User-Agent': 'Mozilla/5.0' };

// navega.emtmalaga.es no envía su certificado intermedio (los navegadores lo buscan solos, Node no),
// así que lo añadimos nosotros a las autoridades de confianza.
const https = require('https'), tls = require('tls'), fs = require('fs'), path = require('path');
const ca = [...tls.rootCertificates, fs.readFileSync(path.join(__dirname, 'geotrust-tls-rsa-ca-g1.pem'), 'utf8')];

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: UA, ca, timeout: 15000 }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(url + ' -> ' + res.statusCode));
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout ' + url)));
    req.on('error', reject);
  });
}

let cacheLineas = null;   // se conserva mientras la función siga "caliente"
async function lineas() {
  if (cacheLineas && Date.now() - cacheLineas.t < 6 * 3600e3) return cacheLineas.d;
  const out = {};
  for (const l of await getJson(URL_LINEAS)) {
    if (!LINEAS.includes(l.codLineaStr)) continue;
    const sentidos = {};
    for (const p of [...l.paradas].sort((a, b) => a.sentido - b.sentido || a.orden - b.orden)) {
      const s = p.parada;
      (sentidos[p.sentido] ||= []).push({ cod: s.codParada, nombre: s.nombreParada, lat: s.latitud, lon: s.longitud });
    }
    // en los datos abiertos "cabecera" es el origen de cada sentido; el destino es la del otro
    out[l.codLineaStr] = { nombre: l.nombreLinea, cabeceras: { 1: l.cabeceraVuelta, 2: l.cabeceraIda }, sentidos };
  }
  cacheLineas = { t: Date.now(), d: out };
  return out;
}

// Datos abiertos del Ayuntamiento: solo dan la última parada de cada bus, con retraso
async function liveAbierto() {
  const out = [];
  for (const b of await getJson(URL_LIVE)) {
    const linea = String(parseInt(b.codLinea));
    if (LINEAS.includes(linea)) out.push({ bus: b.codBus, linea, sentido: b.sentido, parada: +b.codParIni,
      lon: +b.geometry.coordinates[0], lat: +b.geometry.coordinates[1], actualizado: b.properties.last_update });
  }
  return out;
}

// GPS en tiempo real: la misma API que usa la web de EMT
async function liveEmt() {
  const [raw, ls, abierto] = await Promise.all([
    getJson(`${EMT}/buses_servicios?lineId=${LINEAS.join(',')}`),
    lineas(),
    liveAbierto().catch(() => []),
  ]);
  const sentidoAbierto = Object.fromEntries(abierto.map(b => [b.bus, b.sentido]));
  const hora = new Date().toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid' });
  const out = [];
  for (const b of raw.buses) {
    const linea = String(LINEAS.includes(String(b.currentLineId)) ? b.currentLineId : b.lineId);
    const pos = b.vehiclePosition;
    if (!LINEAS.includes(linea) || !pos) continue;
    const ultima = b.lastNode?.num, sig = b.nextNode?.num;
    // el sentido se deduce de en cuál de los dos recorridos está la parada siguiente/anterior
    let sentido = null;
    for (const nodo of [sig, ultima]) {
      const en = Object.entries(ls[linea].sentidos).filter(([, st]) => st.some(p => p.cod === nodo)).map(([s]) => s);
      if (en.length === 1) { sentido = en[0]; break; }
    }
    sentido ||= sentidoAbierto[String(b.vehicleId)] || '1';
    out.push({ bus: String(b.vehicleId), linea, sentido, parada: ultima ?? sig, lat: pos.lat, lon: pos.lng, actualizado: hora });
  }
  return out;
}

// "2026-10-23T11:41:09+0200" -> milisegundos
const aMs = s => Date.parse(s.replace(/([+-]\d\d)(\d\d)$/, '$1:$2'));

async function estimaciones(cod) {
  const r = await getJson(`${EMT}/estimaciones?codPar=${cod}`);
  return (r.estimaciones || []).filter(e => LINEAS.includes(String(e.line.label))).map(e => ({
    cod: e.codPar, linea: String(e.line.label), sentido: String(e.direction), vehiculo: e.vehicleId,
    seg: e.arrival, dist: e.distance, dep: aMs(e.departureTime), destino: (e.destinationName || '').trim() }));
}

module.exports = { lineas, liveEmt, liveAbierto, estimaciones };
