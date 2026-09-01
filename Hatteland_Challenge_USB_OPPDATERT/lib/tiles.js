"use strict";

// Lokalt kartlager.
//
// Kiosken skal kunne staa paa en messe uten nett. Sjokartet kommer normalt
// flis for flis fra cache.kartverket.no, saa uten nett er sjoen blank. Her
// ligger flisene i stedet paa disk under data/tiles/, og serveren henter dem
// derfra. Er en flis ikke lastet ned enda, og maskinen har nett, hentes den
// og lagres - saa lageret fylles ogsaa av vanlig bruk.
//
// URL-ene under er de SAMME som ht-ecdis.html bygger. Ingen del av dem kommer
// fra en forespoersel: laget slaas opp i tabellen, og z/x/y er heltall som er
// sjekket mot zoomnivaaets grenser. Derfor kan /tiles ikke brukes som et
// aapent relay slik /proxy kunne uten allowlisten sin.

const path = require("path");

const WEB_MERCATOR_HALF = 20037508.342789244;

// Bbox i EPSG:3857 for en flis - WMS-lagene (EMODnet) tar utsnitt, ikke z/x/y.
function tileBox3857(z, x, y) {
  const size = (2 * WEB_MERCATOR_HALF) / Math.pow(2, z);
  const minx = -WEB_MERCATOR_HALF + x * size;
  const maxy = WEB_MERCATOR_HALF - y * size;
  return { minx, miny: maxy - size, maxx: minx + size, maxy };
}

function kartverket(layer) {
  return (z, x, y) =>
    `https://cache.kartverket.no/v1/wmts/1.0.0/${layer}/default/webmercator/${z}/${y}/${x}.png`;
}

function emodnet(service, layer) {
  return (z, x, y) => {
    const b = tileBox3857(z, x, y);
    return (
      `https://ows.emodnet-${service}.eu/wms?service=WMS&request=GetMap&version=1.3.0` +
      `&layers=${layer}&styles=&format=image/png&transparent=true&crs=EPSG:3857` +
      `&width=256&height=256&bbox=${b.minx},${b.miny},${b.maxx},${b.maxy}`
    );
  };
}

function arcgis(service) {
  return (z, x, y) =>
    `https://${service}/MapServer/tile/${z}/${y}/${x}`;
}

// Samme lag og samme maksimale zoom som TILE() i ht-ecdis.html. Holdes disse
// i utakt, laster kiosken ned fliser den aldri tegner - eller ber om fliser
// den ikke har lastet ned.
const LAYERS = {
  sjokart: { max: 18, url: kartverket("sjokartraster") },
  topo: { max: 18, url: kartverket("topo") },
  seamark: { max: 18, url: (z, x, y) => `https://tiles.openseamap.org/seamark/${z}/${x}/${y}.png` },
  flyfoto: { max: 19, url: arcgis("server.arcgisonline.com/ArcGIS/rest/services/World_Imagery") },
  ocean: { max: 13, url: arcgis("services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base") },
  oceanref: { max: 13, url: arcgis("services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference") },
  dark: { max: 19, url: (z, x, y) => `https://a.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png` },
  light: { max: 19, url: (z, x, y) => `https://a.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png` },
  bathy: { max: 13, url: emodnet("bathymetry", "emodnet:mean_multicolour") },
  traffic: { max: 12, url: emodnet("humanactivities", "emodnet:vesseldensity_all") }
};

function isLayer(name) {
  return Object.prototype.hasOwnProperty.call(LAYERS, name);
}

// Sant bare for et lag som finnes og en flis som kan eksistere paa det
// zoomnivaaet. Alt annet avvises foer noe roeres paa disk eller nettet.
function isValidTile(layer, z, x, y) {
  if (!isLayer(layer)) return false;
  if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (z < 0 || z > LAYERS[layer].max) return false;
  const n = Math.pow(2, z);
  return x >= 0 && x < n && y >= 0 && y < n;
}

function tileUrl(layer, z, x, y) {
  return LAYERS[layer].url(z, x, y);
}

// z/x/y er heltall og laget er slaatt opp i tabellen, saa stien kan ikke
// peke ut av lageret.
function tilePath(root, layer, z, x, y) {
  return path.join(root, layer, String(z), String(x), `${y}.png`);
}

function lonToX(lon, z) {
  return ((lon + 180) / 360) * Math.pow(2, z);
}

function latToY(lat, z) {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const rad = (clamped * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, z);
}

// Flisene som dekker et omraade paa ett zoomnivaa. bbox er
// [latMin, latMax, lonMin, lonMax] - samme rekkefolge som i tiles-config.json.
function tileRange(bbox, z) {
  const [latMin, latMax, lonMin, lonMax] = bbox;
  const n = Math.pow(2, z);
  const clamp = (v) => Math.max(0, Math.min(n - 1, v));
  return {
    z,
    x0: clamp(Math.floor(lonToX(Math.min(lonMin, lonMax), z))),
    x1: clamp(Math.floor(lonToX(Math.max(lonMin, lonMax), z))),
    y0: clamp(Math.floor(latToY(Math.max(latMin, latMax), z))),
    y1: clamp(Math.floor(latToY(Math.min(latMin, latMax), z)))
  };
}

function countTiles(bbox, z) {
  const r = tileRange(bbox, z);
  return (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1);
}

// Alle flisene i en jobb, som en generator - en stor jobb er millioner av
// fliser, og de skal ikke ligge i en liste i minnet samtidig.
function* eachTile(bbox, minZoom, maxZoom) {
  for (let z = minZoom; z <= maxZoom; z++) {
    const r = tileRange(bbox, z);
    for (let x = r.x0; x <= r.x1; x++) {
      for (let y = r.y0; y <= r.y1; y++) {
        yield { z, x, y };
      }
    }
  }
}

function isValidBbox(bbox) {
  return (
    Array.isArray(bbox) &&
    bbox.length === 4 &&
    bbox.every((v) => Number.isFinite(v)) &&
    bbox[0] >= -85 && bbox[1] <= 85 && bbox[0] < bbox[1] &&
    bbox[2] >= -180 && bbox[3] <= 180 && bbox[2] < bbox[3]
  );
}

module.exports = {
  LAYERS,
  isLayer,
  isValidTile,
  isValidBbox,
  tileUrl,
  tilePath,
  tileRange,
  countTiles,
  eachTile
};
