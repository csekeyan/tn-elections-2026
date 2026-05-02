// Interactive TN constituency map - TN only, no world map

import { getPartyColor, getAlliance, getAllianceColor, getData } from './data.js';

let map = null;
let geoLayer = null;
let geojsonData = null;
let onConstituencyClick = null;

// TN bounding box (tight)
const TN_BOUNDS = [[8.0, 76.2], [13.6, 80.4]];

export function setClickHandler(fn) {
  onConstituencyClick = fn;
}

export async function initMap() {
  map = L.map('map', {
    center: [10.9, 78.4],
    zoom: 7,
    minZoom: 7,
    maxZoom: 12,
    zoomControl: true,
    attributionControl: false,
    scrollWheelZoom: true,
    maxBounds: L.latLngBounds(TN_BOUNDS).pad(0.05),
    maxBoundsViscosity: 1.0,
  });

  // No tile layer at all - pure dark background, TN polygons only
  // The map container's CSS background serves as the "ocean"

  const res = await fetch('./tn-constituencies.geojson');
  geojsonData = await res.json();
  renderLayer();
}

function getConstituencyResult(acNo) {
  const data = getData();
  if (!data) return null;
  return data.constituencies.find(c => c.id === acNo);
}

function getStyle(feature) {
  const acNo = feature.properties.ac_no;
  const result = getConstituencyResult(acNo);
  let fillColor = '#2a3441';
  let fillOpacity = 0.85;

  if (result && result.candidates.length > 0) {
    const leader = result.candidates[0];
    const alliance = getAlliance(leader.party);
    fillColor = getAllianceColor(alliance);
    fillOpacity = result.status === 'declared' ? 0.9 : 0.72;
  }

  return {
    fillColor,
    fillOpacity,
    weight: 1.2,
    color: 'rgba(15, 23, 42, 0.8)',
    opacity: 1,
  };
}

function onEachFeature(feature, layer) {
  const acNo = feature.properties.ac_no;
  const acName = feature.properties.ac_name;
  const district = feature.properties.dist_name;

  layer.on({
    mouseover: (e) => {
      const l = e.target;
      l.setStyle({
        weight: 2,
        color: 'rgba(255,255,255,0.6)',
        fillOpacity: 0.95
      });
      l.bringToFront();

      const result = getConstituencyResult(acNo);
      let tooltipHtml = `<strong>${acName}</strong><br><span style="opacity:0.7">${district}</span>`;
      if (result && result.candidates.length > 0) {
        const leader = result.candidates[0];
        const color = getPartyColor(leader.party);
        tooltipHtml += `<br><span style="color:${color};font-weight:600">${leader.party}</span> &middot; ${leader.name}`;
        tooltipHtml += `<br>Margin: <strong>${result.margin.toLocaleString()}</strong>`;
        if (result.status === 'declared') {
          tooltipHtml += `<br><span style="color:#6ee7a0">DECLARED</span>`;
        }
      }
      layer.bindTooltip(tooltipHtml, {
        sticky: true,
        direction: 'top',
        offset: [0, -10],
      }).openTooltip();
    },
    mouseout: (e) => {
      geoLayer.resetStyle(e.target);
      e.target.unbindTooltip();
    },
    click: () => {
      if (onConstituencyClick) onConstituencyClick(acNo);
    }
  });
}

function renderLayer() {
  if (geoLayer) map.removeLayer(geoLayer);

  geoLayer = L.geoJSON(geojsonData, {
    style: getStyle,
    onEachFeature: onEachFeature,
  }).addTo(map);

  map.fitBounds(geoLayer.getBounds(), { padding: [10, 10] });
}

export function updateMap() {
  if (!geoLayer || !geojsonData) return;
  geoLayer.eachLayer(layer => {
    if (layer.feature) layer.setStyle(getStyle(layer.feature));
  });
}

export function highlightConstituency(acNo) {
  if (!geoLayer) return;
  geoLayer.eachLayer(layer => {
    if (layer.feature && layer.feature.properties.ac_no === acNo) {
      map.fitBounds(layer.getBounds(), { maxZoom: 10, padding: [50, 50] });
      layer.setStyle({ weight: 3, color: 'rgba(255,255,255,0.8)', fillOpacity: 0.95 });
    }
  });
}
