"use strict";

// Kartlageret staar mellom kiosken og nettet. To ting maa holde:
//
// 1) /tiles kan ikke brukes til aa hente noe annet enn en kartflis. Laget
//    slaas opp i en fast tabell, og z/x/y maa vaere heltall innenfor
//    zoomnivaaets rutenett - ellers ville endepunktet vaert et aapent relay
//    og en vei ut av flismappen.
// 2) Flisregningen maa stemme med den nettleseren gjor. Er de i utakt, laster
//    tools/download_tiles.js ned fliser kiosken aldri ber om, og messa staar
//    med blank sjoe selv om lageret ser fullt ut.

const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const tiles = require("../lib/tiles");

test("only known layers exist", () => {
  assert.ok(tiles.isLayer("sjokart"));
  assert.ok(tiles.isLayer("seamark"));
  assert.equal(tiles.isLayer("../../config"), false);
  assert.equal(tiles.isLayer("constructor"), false, "arvede egenskaper er ikke lag");
  assert.equal(tiles.isLayer("__proto__"), false);
});

test("a tile request must name a real tile", () => {
  assert.ok(tiles.isValidTile("sjokart", 12, 2130, 1130));
  assert.ok(tiles.isValidTile("sjokart", 0, 0, 0));

  assert.equal(tiles.isValidTile("ukjent", 12, 1, 1), false);
  assert.equal(tiles.isValidTile("sjokart", 12.5, 1, 1), false, "z maa vaere heltall");
  assert.equal(tiles.isValidTile("sjokart", -1, 1, 1), false);
  assert.equal(tiles.isValidTile("sjokart", 2, 4, 0), false, "x utenfor rutenettet paa z2");
  assert.equal(tiles.isValidTile("sjokart", 2, 0, -1), false);
  // Hvert lag har sin egen maksimale zoom, og den er den samme som i
  // ht-ecdis.html. Ocean stopper paa 13 der sjokartet gaar til 18.
  assert.equal(tiles.isValidTile("ocean", 14, 1, 1), false);
  assert.ok(tiles.isValidTile("ocean", 13, 1, 1));
  assert.equal(tiles.isValidTile("sjokart", 19, 1, 1), false);
});

test("a tile path stays inside the store", () => {
  const root = "/kiosk/data/tiles";
  const file = tiles.tilePath(root, "sjokart", 12, 2130, 1130);

  assert.equal(file, path.join(root, "sjokart", "12", "2130", "1130.png"));
  assert.ok(path.normalize(file).startsWith(root + path.sep));
});

test("the chart URL is the one Kartverket serves - y before x", () => {
  // WMTS legger raden foer kolonnen. Bytter de plass, laster kiosken ned et
  // helt annet sted enn det den tegner, og feilen vises ikke foer paa messa.
  assert.equal(
    tiles.tileUrl("sjokart", 12, 2130, 1130),
    "https://cache.kartverket.no/v1/wmts/1.0.0/sjokartraster/default/webmercator/12/1130/2130.png"
  );
  assert.equal(
    tiles.tileUrl("seamark", 12, 2130, 1130),
    "https://tiles.openseamap.org/seamark/12/2130/1130.png"
  );
});

test("tile ranges match the Web Mercator grid", () => {
  // Hele verden er en flis paa z0 og fire paa z1.
  assert.equal(tiles.countTiles([-85, 85, -180, 180], 0), 1);
  assert.equal(tiles.countTiles([-85, 85, -180, 180], 1), 4);

  // Nullmeridianen ved ekvator ligger i hjornet mellom de fire z1-flisene.
  const r = tiles.tileRange([0.1, 10, 0.1, 10], 1);
  assert.deepEqual({ x0: r.x0, y0: r.y0 }, { x0: 1, y0: 0 });

  // Et omraade lenger nord gir alltid lavere y enn et lenger sor.
  const nord = tiles.tileRange([63, 64, 5, 6], 10);
  const sor = tiles.tileRange([58, 59, 5, 6], 10);
  assert.ok(nord.y0 < sor.y0, "y vokser sorover");
});

test("a bbox given the wrong way round is refused", () => {
  assert.ok(tiles.isValidBbox([59.2, 59.6, 5.0, 5.6]));
  assert.equal(tiles.isValidBbox([59.6, 59.2, 5.0, 5.6]), false, "latMin over latMax");
  assert.equal(tiles.isValidBbox([59.2, 59.6, 5.6, 5.0]), false, "lonMin over lonMax");
  assert.equal(tiles.isValidBbox([59.2, 59.6, 5.0]), false);
  assert.equal(tiles.isValidBbox([59.2, 95, 5.0, 5.6]), false, "utenfor kartet");
  assert.equal(tiles.isValidBbox("59,60,5,6"), false);
});

test("every tile in a job is one the endpoint would serve", () => {
  const bbox = [59.2, 59.3, 5.0, 5.1];
  let count = 0;

  for (const t of tiles.eachTile(bbox, 8, 12)) {
    assert.ok(tiles.isValidTile("sjokart", t.z, t.x, t.y), `${t.z}/${t.x}/${t.y}`);
    count++;
  }

  let expected = 0;
  for (let z = 8; z <= 12; z++) expected += tiles.countTiles(bbox, z);
  assert.equal(count, expected);
});

test("the shipped download plan is valid and stays a sane size", () => {
  const config = require("../config/tiles-config.json");

  assert.ok(config.layers.length && config.areas.length);
  for (const layer of config.layers) assert.ok(tiles.isLayer(layer), layer);

  let total = 0;
  for (const area of config.areas) {
    assert.ok(tiles.isValidBbox(area.bbox), area.name);
    assert.ok(area.minZoom <= area.maxZoom, area.name);
    for (const layer of config.layers) {
      const maxZoom = Math.min(area.maxZoom, tiles.LAYERS[layer].max);
      for (let z = area.minZoom; z <= maxZoom; z++) total += tiles.countTiles(area.bbox, z);
    }
  }

  // Et zoomnivaa til firedobler nedlastingen. Taket her er ikke en grense i
  // seg selv - det er en paaminnelse om aa regne paa plassen foer man utvider.
  assert.ok(total < 60000, `${total} fliser er mer enn en minnepenn boer baere`);
});
