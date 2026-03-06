import { loadTile } from './tileLoader.js'
import { geohash2 } from './geohash2.js'
import { pointInPolygon } from './pip.js'

export async function reverseGeocode(lat, lon) {
  const hash = geohash2(lat, lon)
  const tile = await loadTile(hash)

  const point = [lon, lat]

  // Ensure land polygons are checked before ocean polygons
  const features = tile.features.slice().sort((a, b) => {
    const aIsLand = a.properties.type === 'land' ? 0 : 1
    const bIsLand = b.properties.type === 'land' ? 0 : 1
    return aIsLand - bIsLand
  })

  for (const feature of features) {
    if (feature.bbox && !pointInBbox(point, feature.bbox)) continue
    if (pointInPolygon(point, feature.geometry)) {
      return feature.properties
    }
  }

  return null
}

function pointInBbox([x, y], [minX, minY, maxX, maxY]) {
  return x >= minX && x <= maxX && y >= minY && y <= maxY
}
