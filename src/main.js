import {
  ensureFeatureCollection, featureCollection, formatMeasure,
  parseMapState, serializeMapState,
} from './geojson.js';

const LAKE = [-16.1005, -48.28942]; // Referência de água: NÃO é entrada/rota por estrada.
const STORAGE_KEY = 'mapa-corumba-iv:marcacoes:v1';
const $ = id => document.getElementById(id);
const status = message => { $('status-message').textContent = message; };

if (!window.L || !L.Control.Draw) {
  status('Não foi possível carregar as ferramentas de mapa. Verifique a internet e recarregue.');
  throw new Error('Leaflet / Leaflet Draw indisponível.');
}

const map = L.map('map', {zoomControl:false, preferCanvas:true}).setView(LAKE,11);
L.control.zoom({position:'bottomright'}).addTo(map);
const basemaps = {
  'Mapa de ruas': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors', maxZoom:19
  }),
  'Imagem de satélite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution:'Tiles &copy; Esri, Maxar, Earthstar Geographics', maxZoom:19
  }),
};
basemaps['Mapa de ruas'].addTo(map);
L.control.layers(basemaps,null,{position:'topright',collapsed:true}).addTo(map);

// O pino é apenas uma referência cartográfica, sem supor que haja acesso rodoviário.
L.circleMarker(LAKE,{radius:8,color:'#0b3740',weight:3,fillColor:'#39dcb3',fillOpacity:1})
  .addTo(map).bindPopup('<strong>Lago Corumbá IV</strong><p>Referência do reservatório. Para navegar de carro, escolha um acesso em terra usando “Escolher chegada”.</p>');

const drawnItems = L.featureGroup().addTo(map);
const drawing = new L.Control.Draw({
  position:'topleft',
  edit:{featureGroup:drawnItems,remove:true},
  draw:{
    polygon:{shapeOptions:{color:'#4adac4',weight:3,fillOpacity:.2},allowIntersection:false,showArea:true},
    polyline:{shapeOptions:{color:'#f3bc77',weight:4}},
    marker:true,
    rectangle:false,circle:false,circlemarker:false
  }
});
map.addControl(drawing);

let gpsWatch = null;
let gpsPosition = null;
let gpsMarker = null;
let gpsAccuracyCircle = null;
let choosingArrival = false;
let arrivalMarker = null;

function setMode(value){ $('map-mode').textContent=value; }
function layerGeoJSON(layer){
  const geo = layer.toGeoJSON();
  return {type:'Feature', geometry:geo.geometry, properties:{name:layer._markName || 'Marcação'}};
}
function fitLayer(layer){
  if (typeof layer.getBounds === 'function') map.fitBounds(layer.getBounds().pad(.3),{maxZoom:16});
  else map.setView(layer.getLatLng(),15);
}
function bindMarkPopup(layer){
  const node = document.createElement('div');
  const name = document.createElement('div');
  name.className='popup-title';
  name.textContent=layer._markName || 'Marcação';
  node.append(name);
  const measure = document.createElement('div');
  measure.className='popup-measure';
  measure.textContent=formatMeasure(layer.toGeoJSON().geometry);
  node.append(measure);
  layer.bindPopup(node);
}
function collect(){
  const features=[];
  drawnItems.eachLayer(layer=>features.push(layerGeoJSON(layer)));
  return featureCollection(features);
}
function save(){
  try{localStorage.setItem(STORAGE_KEY,serializeMapState(collect()));}
  catch{ status('Não foi possível salvar no navegador. Exporte o GeoJSON para preservar os dados.'); }
}
function renderList(){
  const list=$('mark-list'); list.replaceChildren();
  const layers=drawnItems.getLayers();
  $('mark-count').textContent=String(layers.length);
  if(!layers.length){
    const empty=document.createElement('p');empty.className='empty';empty.textContent='Nenhuma marcação ainda.';list.append(empty);return;
  }
  for(const [i,layer] of layers.entries()){
    const button=document.createElement('button');button.type='button';button.className='mark-item';
    const label=document.createElement('span'),title=document.createElement('strong'),meta=document.createElement('small');
    title.textContent=layer._markName || `Marcação ${i+1}`;
    meta.textContent=formatMeasure(layer.toGeoJSON().geometry);
    label.append(title,meta);
    const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
    button.append(label,arrow);
    button.addEventListener('click',()=>{ fitLayer(layer);layer.openPopup(); });
    list.append(button);
  }
}
function addFeature(feature){
  const layer=L.GeoJSON.geometryToLayer(feature,{pointToLayer:(f,latLng)=>L.marker(latLng)});
  if(layer.setStyle){
    layer.setStyle(feature.geometry.type==='Polygon'?{color:'#4adac4',weight:3,fillOpacity:.2}:{color:'#f3bc77',weight:4});
  }
  layer._markName=feature.properties.name;
  bindMarkPopup(layer);
  drawnItems.addLayer(layer);
}
function loadCollection(value,{fit=false}={}){
  const data=ensureFeatureCollection(value);
  drawnItems.clearLayers();
  for(const feature of data.features) addFeature(feature);
  if(fit && drawnItems.getLayers().length) fitLayer(drawnItems);
  save();renderList();
}
function sync(){
  drawnItems.eachLayer(layer=>bindMarkPopup(layer));
  save();renderList();
}

try{
  const saved=localStorage.getItem(STORAGE_KEY);
  if(saved) loadCollection(parseMapState(saved));
}catch{ status('Armazenamento local indisponível. Exporte suas marcações regularmente.'); }
renderList();

map.on(L.Draw.Event.CREATED,event=>{
  const layer=event.layer;
  const defaultName=event.layerType==='marker'?'Ponto':event.layerType==='polyline'?'Linha':'Área';
  const name=window.prompt('Nome desta marcação (até 100 caracteres):',defaultName);
  layer._markName=(name || defaultName).trim().slice(0,100) || defaultName;
  bindMarkPopup(layer);
  drawnItems.addLayer(layer);
  sync();setMode('Visualização');status(`${defaultName} criado e salvo neste navegador.`);
});
map.on(L.Draw.Event.EDITED,()=>{sync();status('Marcações atualizadas.');});
map.on(L.Draw.Event.DELETED,()=>{sync();status('Marcações removidas.');});
map.on('draw:drawstart',()=>setMode('Desenhando'));
map.on('draw:drawstop',()=>setMode('Visualização'));
map.on('draw:editstart',()=>setMode('Editando'));
map.on('draw:editstop',()=>setMode('Visualização'));
map.on('draw:deletestart',()=>setMode('Excluindo'));
map.on('draw:deletestop',()=>setMode('Visualização'));

$('btn-clear').addEventListener('click',()=>{
  if(!drawnItems.getLayers().length) return;
  if(!window.confirm('Apagar todas as marcações salvas neste navegador?')) return;
  drawnItems.clearLayers();sync();status('Todas as marcações foram apagadas.');
});
$('btn-lake').addEventListener('click',()=>{
  map.setView(LAKE,11);status('Visualização do Lago Corumbá IV.');
});
$('btn-export').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(collect(),null,2)],{type:'application/geo+json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='marcacoes-corumba-iv.geojson';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
  status('Arquivo GeoJSON exportado.');
});
$('input-import').addEventListener('change',async event=>{
  const file=event.target.files?.[0];
  if(!file) return;
  try{
    if(file.size > 3_000_000) throw new Error('Arquivo grande demais (limite: 3 MB).');
    const raw=JSON.parse(await file.text());
    const normalized=ensureFeatureCollection(raw);
    if(drawnItems.getLayers().length && !window.confirm('Substituir as marcações atuais pelo arquivo importado?')) return;
    loadCollection(normalized,{fit:true});status(`${normalized.features.length} marcações importadas.`);
  }catch(error){ status(`Importação não realizada: ${error.message}`); }
  finally{event.target.value='';}
});

function updateGpsButton(active){
  $('btn-gps').classList.toggle('active',active);
  $('btn-gps').classList.toggle('primary',!active);
  $('btn-gps').querySelector('span:last-child').textContent=active?'Desativar GPS':'Ativar meu GPS';
  $('gps-header').textContent=active?'GPS em uso':'GPS desativado';
  document.querySelector('.live-dot').classList.toggle('on',active);
}
function stopGps(){
  if(gpsWatch!==null && navigator.geolocation) navigator.geolocation.clearWatch(gpsWatch);
  gpsWatch=null;gpsPosition=null;
  if(gpsMarker){map.removeLayer(gpsMarker);gpsMarker=null;}
  if(gpsAccuracyCircle){map.removeLayer(gpsAccuracyCircle);gpsAccuracyCircle=null;}
  updateGpsButton(false);
  $('gps-detail').textContent='GPS desligado. Sua localização não é armazenada.';
  status('GPS desativado.');
}
$('btn-gps').addEventListener('click',()=>{
  if(gpsWatch!==null){stopGps();return;}
  if(!navigator.geolocation){status('Este navegador não oferece geolocalização.');return;}
  $('gps-detail').textContent='Solicitando permissão de localização…';
  gpsWatch=navigator.geolocation.watchPosition(({coords})=>{
    gpsPosition={lat:coords.latitude,lng:coords.longitude};
    const point=[gpsPosition.lat,gpsPosition.lng];
    if(!gpsMarker){
      gpsMarker=L.circleMarker(point,{radius:8,color:'#ffffff',weight:3,fillColor:'#1679e6',fillOpacity:1}).addTo(map).bindPopup('Minha localização atual (GPS)');
      gpsAccuracyCircle=L.circle(point,{radius:coords.accuracy,stroke:true,color:'#1679e6',opacity:.6,fillOpacity:.08,weight:2}).addTo(map);
      map.setView(point,13);
    }else{
      gpsMarker.setLatLng(point);
      gpsAccuracyCircle.setLatLng(point).setRadius(coords.accuracy);
    }
    $('gps-detail').textContent=`Precisão estimada: ${Math.round(coords.accuracy)} m. Localização não salva.`;
    status('Sua localização foi atualizada no mapa.');
    updateGpsButton(true);
  },error=>{
    stopGps();
    const reasons={1:'Permissão de localização negada.',2:'Localização indisponível.',3:'Tempo esgotado ao consultar o GPS.'};
    const message=reasons[error.code] || 'Não foi possível obter a localização.';
    $('gps-detail').textContent=message;
    status(message+' Abra em HTTPS ou localhost e permita o GPS.');
  },{enableHighAccuracy:true,maximumAge:10000,timeout:15000});
  updateGpsButton(true);
});

$('btn-arrival').addEventListener('click',()=>{
  choosingArrival=!choosingArrival;
  $('btn-arrival').classList.toggle('active',choosingArrival);
  setMode(choosingArrival?'Escolher chegada':'Visualização');
  status(choosingArrival?'Toque em um acesso terrestre ao lago para definir o destino.':'Seleção de chegada cancelada.');
  map.getContainer().style.cursor=choosingArrival?'crosshair':'';
});
function setArrival(latlng){
  if(arrivalMarker) map.removeLayer(arrivalMarker);
  arrivalMarker=L.marker(latlng,{draggable:true}).addTo(map);
  const update=()=>{
    const place=arrivalMarker.getLatLng();
    $('arrival-detail').textContent=`Chegada: ${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}. Confirme se há acesso público e seguro.`;
  };
  arrivalMarker.bindPopup('Chegada escolhida. Arraste para ajustar o ponto.');
  arrivalMarker.on('dragend',update);update();
  choosingArrival=false;setMode('Visualização');
  $('btn-arrival').classList.remove('active');
  map.getContainer().style.cursor='';
  status('Destino escolhido. Confirme o acesso antes de abrir a rota.');
}
map.on('click',event=>{if(choosingArrival)setArrival(event.latlng);});
$('btn-route').addEventListener('click',()=>{
  if(!arrivalMarker){status('Primeiro escolha uma chegada em terra próxima ao lago.');$('arrival-detail').classList.add('warning');return;}
  $('arrival-detail').classList.remove('warning');
  const place=arrivalMarker.getLatLng();
  const params=new URLSearchParams({api:'1',destination:`${place.lat.toFixed(6)},${place.lng.toFixed(6)}`,travelmode:'driving'});
  if(gpsPosition) params.set('origin',`${gpsPosition.lat.toFixed(6)},${gpsPosition.lng.toFixed(6)}`);
  window.open(`https://www.google.com/maps/dir/?${params.toString()}`,'_blank','noopener,noreferrer');
  status('Rota aberta no Google Maps. Confira vias e condições de acesso.');
});
window.addEventListener('pagehide',()=>{
  if(gpsWatch!==null && navigator.geolocation) navigator.geolocation.clearWatch(gpsWatch);
});
