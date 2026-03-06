export function pointInPolygon([x, y], geom) {
  if (geom.type === 'Polygon') {
    return polygonContains(geom.coordinates, x, y)
  }

  if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) {
      if (polygonContains(poly, x, y)) return true
    }
    return false
  }

  return false
}

function polygonContains(rings, x, y) {
  let inside = false

  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1]
      const xj = ring[j][0], yj = ring[j][1]

      const intersect =
        yi > y !== yj > y &&
        x < ((xj - xi) * (y - yi)) / (yj - yi) + xi

      if (intersect) inside = !inside
    }
  }

  return inside
}
