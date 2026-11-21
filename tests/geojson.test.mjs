import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ensureFeatureCollection,
  normalizeGeometry,
  featureCollection,
  lineLengthMeters,
  polygonAreaMeters,
  formatMeasure,
  serializeMapState,
  parseMapState,
} from '../src/geojson.js';

test('normaliza GeoJSON com dados válidos', () => {
  const data = { type: 'FeatureCollection', features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-48.28942, -16.1005] }, properties: { name: 'Margem' } },
  ] };
  const normalized = ensureFeatureCollection(data);
  assert.equal(normalized.features[0].properties.name, 'Margem');
});

test('impede coordenadas inválidas e objetos desconhecidos', () => {
  assert.throws(() => ensureFeatureCollection({type:'FeatureCollection', features:[{type:'Feature', geometry:{type:'Point', coordinates:[200, 0]}, properties:{}}]}));
  assert.throws(() => normalizeGeometry({type:'GeometryCollection', geometries:[]}));
});

test('limita coleções grandes e limita tamanho de nomes', () => {
  assert.throws(() => ensureFeatureCollection({type:'FeatureCollection',features:Array.from({length:501},()=>({type:'Feature',geometry:{type:'Point', coordinates:[-48,-16]},properties:{}}))}));
  const longName = 'x'.repeat(1000);
  assert.equal(ensureFeatureCollection({type:'FeatureCollection', features:[{type:'Feature', geometry:{type:'Point', coordinates:[-48,-16]},properties:{name:longName}}]}).features[0].properties.name.length, 100);
});

test('distância entre dois pontos próximos é positiva e em metros', () => {
  const length = lineLengthMeters([[-48.28942, -16.1005], [-48.28942, -16.1105]]);
  assert.ok(length > 1100 && length < 1120, `distância: ${length}`);
});

test('área de um quadrado conhecido é positiva', () => {
  const area = polygonAreaMeters([[[0,0],[0.001,0],[0.001,0.001],[0,0.001],[0,0]]]);
  assert.ok(area > 10000 && area < 13000, `área: ${area}`);
});

test('formata medidas em m, km e hectares', () => {
  assert.match(formatMeasure({type:'LineString',coordinates:[[-48,-16],[-48,-16.01]]}), /km/);
  assert.match(formatMeasure({type:'Polygon', coordinates:[[[0,0],[0.01,0],[0.01,0.01],[0,0.01],[0,0]]]}), /ha/);
  assert.equal(formatMeasure({type:'Point',coordinates:[0,0]}), 'Ponto');
});

test('persistência não inclui GPS e aceita mapa antigo com formato válido', () => {
  const geojson = featureCollection();
  const packed = serializeMapState(geojson);
  assert.equal(typeof packed, 'string');
  assert.ok(!packed.includes('gps'));
  assert.deepEqual(parseMapState(packed), geojson);
  assert.deepEqual(parseMapState('texto inválido'), featureCollection());
});
