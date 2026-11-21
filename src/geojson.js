const RADIUS = 6371008.8;
const round = value => Number(value.toFixed(1));

export function featureCollection(features = []) {
  return { type: 'FeatureCollection', features };
}

function validCoordinate(coordinate) {
  if (!Array.isArray(coordinate) || coordinate.length < 2 || coordinate.length > 3) {
    throw new Error('Coordenada inválida.');
  }
  const [lon, lat] = coordinate;
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || lon < -180 || lon > 180 || lat < -90 || lat > 90) {
    throw new Error('Coordenadas fora da faixa válida.');
  }
  if (coordinate.length === 3 && !Number.isFinite(coordinate[2])) throw new Error('Altitude inválida.');
  return [lon, lat];
}

export function normalizeGeometry(geometry) {
  if (!geometry || typeof geometry !== 'object') throw new Error('Geometria ausente.');
  const {type, coordinates} = geometry;
  if (type === 'Point') return {type, coordinates: validCoordinate(coordinates)};
  if (type === 'LineString') {
    if (!Array.isArray(coordinates) || coordinates.length < 2 || coordinates.length > 10000) throw new Error('Linha inválida.');
    return {type, coordinates: coordinates.map(validCoordinate)};
  }
  if (type === 'Polygon') {
    if (!Array.isArray(coordinates) || !coordinates.length || coordinates.length > 20) throw new Error('Polígono inválido.');
    return {type, coordinates: coordinates.map(ring => {
      if (!Array.isArray(ring) || ring.length < 4 || ring.length > 10000) throw new Error('Anel inválido.');
      const points = ring.map(validCoordinate);
      if (points[0][0] !== points.at(-1)[0] || points[0][1] !== points.at(-1)[1]) throw new Error('O contorno precisa ser fechado.');
      return points;
    })};
  }
  throw new Error('Somente pontos, linhas e polígonos são aceitos.');
}

export function ensureFeatureCollection(value) {
  if (!value || typeof value !== 'object' || value.type !== 'FeatureCollection' || !Array.isArray(value.features)) {
    throw new Error('O arquivo deve ser um GeoJSON FeatureCollection.');
  }
  if (value.features.length > 500) throw new Error('Máximo de 500 marcações.');
  return featureCollection(value.features.map((feature, index) => {
    if (!feature || feature.type !== 'Feature') throw new Error('Marcação inválida.');
    const name = typeof feature.properties?.name === 'string' ? feature.properties.name.trim().slice(0,100) : `Marcação ${index + 1}`;
    return {type:'Feature', geometry:normalizeGeometry(feature.geometry), properties:{name:name || `Marcação ${index + 1}`}};
  }));
}

const toRad = angle => angle * Math.PI / 180;
export function lineLengthMeters(points) {
  let total = 0;
  for (let i=1; i<points.length; i++) {
    const [lon1, lat1] = points[i-1].map(toRad);
    const [lon2, lat2] = points[i].map(toRad);
    const dLat = lat2-lat1;
    const dLon = lon2-lon1;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    total += 2 * RADIUS * Math.asin(Math.min(1,Math.sqrt(a)));
  }
  return total;
}

// Aproximação equiretangular local, adequada a marcações pequenas.
export function polygonAreaMeters(rings) {
  const lat0 = rings[0][0][1];
  const scaleX = RADIUS * Math.cos(toRad(lat0));
  const scaleY = RADIUS;
  const ringArea = ring => {
    let sum = 0;
    for (let i=0; i<ring.length-1; i++) {
      const [x1,y1] = [toRad(ring[i][0])*scaleX, toRad(ring[i][1])*scaleY];
      const [x2,y2] = [toRad(ring[i+1][0])*scaleX, toRad(ring[i+1][1])*scaleY];
      sum += x1*y2 - x2*y1;
    }
    return Math.abs(sum)/2;
  };
  return Math.max(0, ringArea(rings[0]) - rings.slice(1).reduce((acc,ring)=>acc+ringArea(ring),0));
}

export function formatMeasure(geometry) {
  if (geometry.type === 'LineString') {
    const distance = lineLengthMeters(geometry.coordinates);
    return distance < 1000 ? `${round(distance).toLocaleString('pt-BR')} m` : `${(distance/1000).toFixed(2).replace('.',',')} km`;
  }
  if (geometry.type === 'Polygon') {
    const area = polygonAreaMeters(geometry.coordinates);
    return area < 10000 ? `${round(area).toLocaleString('pt-BR')} m²` : `${(area/10000).toFixed(2).replace('.',',')} ha`;
  }
  return 'Ponto';
}

export function serializeMapState(features) {
  return JSON.stringify(ensureFeatureCollection(features));
}

export function parseMapState(raw) {
  try { return ensureFeatureCollection(JSON.parse(raw)); }
  catch { return featureCollection(); }
}
