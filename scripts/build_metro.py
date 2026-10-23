"""Convierte el GTFS de Metro Málaga en public/metro.json (solo lo que usa la app).

Uso:  python scripts/build_metro.py [ruta/al/GTFS.zip]
Sin argumentos descarga https://metromalaga.es/GTFS/GTFS_METRO_MALAGA.zip.
El feed solo cubre unas semanas (ahora hasta el 19/11/2026): hay que volver a ejecutarlo de vez en cuando.
"""
import csv, io, json, os, sys, urllib.request, zipfile
from collections import defaultdict

URL = 'https://metromalaga.es/GTFS/GTFS_METRO_MALAGA.zip'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'metro.json')

if len(sys.argv) > 1:
    raw = open(sys.argv[1], 'rb').read()
else:
    raw = urllib.request.urlopen(urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60).read()
z = zipfile.ZipFile(io.BytesIO(raw))


def tabla(nombre):
    return list(csv.DictReader(io.TextIOWrapper(z.open(nombre), encoding='utf-8-sig')))


def segundos(hhmmss):          # las horas pasan de 24 después de medianoche (25:10:00)
    h, m, s = map(int, hhmmss.split(':'))
    return h * 3600 + m * 60 + s


paradas = {s['stop_id']: s for s in tabla('stops.txt') if s['location_type'] == '0'}
rutas = {r['route_id']: r for r in tabla('routes.txt')}
viajes = {t['trip_id']: t for t in tabla('trips.txt')}

horas = defaultdict(list)
for st in tabla('stop_times.txt'):
    horas[st['trip_id']].append((int(st['stop_sequence']), st['stop_id'], segundos(st['departure_time'])))

servicios = defaultdict(set)
for c in tabla('calendar_dates.txt'):
    if c['exception_type'] == '1':
        servicios[c['date']].add(c['service_id'])
assert all(len(v) == 1 for v in servicios.values()), 'hay días con más de un servicio'

formas = defaultdict(list)
for p in tabla('shapes.txt'):
    formas[p['shape_id']].append((int(p['shape_pt_sequence']), round(float(p['shape_pt_lat']), 5), round(float(p['shape_pt_lon']), 5)))

# agrupar por línea y sentido
grupos = defaultdict(list)
for tid, t in viajes.items():
    grupos[(t['route_id'], t['direction_id'])].append((t, sorted(horas[tid])))

lineas = {}
for (ruta, sentido), lista in sorted(grupos.items()):
    # recorrido de referencia: el viaje con más paradas
    ref = max(lista, key=lambda x: len(x[1]))[1]
    orden = [sid for _, sid, _ in ref]
    for _, h in lista:   # ningún viaje puede tener paradas fuera del recorrido de referencia
        assert [s for _, s, _ in h if s not in orden] == [], 'parada fuera del recorrido'
    ln = lineas.setdefault(ruta, {'nombre': rutas[ruta]['route_short_name'], 'color': '#' + rutas[ruta]['route_color'],
                                  'forma': [[a, b] for _, a, b in sorted(formas[lista[0][0]['shape_id']])], 'sentidos': {}})
    ln['sentidos'][sentido] = {
        'destino': lista[0][0]['trip_headsign'],
        'estaciones': [{'id': sid, 'nombre': paradas[sid]['stop_name'], 'lat': round(float(paradas[sid]['stop_lat']), 6),
                        'lon': round(float(paradas[sid]['stop_lon']), 6)} for sid in orden],
        'viajes': sorted(({'s': t['service_id'], 't': [dict((s, x) for _, s, x in h).get(sid) for sid in orden]}
                          for t, h in lista), key=lambda v: (v['s'], next(x for x in v['t'] if x is not None))),
    }

fechas = sorted(servicios)
salida = {'desde': fechas[0], 'hasta': fechas[-1], 'servicios': {d: next(iter(s)) for d, s in servicios.items()}, 'lineas': lineas}
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(salida, f, ensure_ascii=False, separators=(',', ':'))
print(os.path.getsize(OUT), 'bytes;', fechas[0], '->', fechas[-1], {r: {s: len(d['viajes']) for s, d in l['sentidos'].items()} for r, l in lineas.items()})
