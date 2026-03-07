const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'

export function geohash2(lat, lon) {
  return encodeGeohash(lat, lon, 2)
}

function encodeGeohash(lat, lon, precision = 12) {
  let minLat = -90, maxLat = 90
  let minLon = -180, maxLon = 180
  let hash = ''
  let bit = 0
  let ch = 0
  let even = true

  while (hash.length < precision) {
    if (even) {
      const mid = (minLon + maxLon) / 2
      if (lon >= mid) {
        ch |= 1 << (4 - bit)
        minLon = mid
      } else {
        maxLon = mid
      }
    } else {
      const mid = (minLat + maxLat) / 2
      if (lat >= mid) {
        ch |= 1 << (4 - bit)
        minLat = mid
      } else {
        maxLat = mid
      }
    }

    even = !even

    if (bit < 4) {
      bit++
    } else {
      hash += BASE32[ch]
      bit = 0
      ch = 0
    }
  }

  return hash
}
