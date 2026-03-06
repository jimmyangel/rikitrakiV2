const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'

export function geohash2(lat, lon) {
  let minLat = -90, maxLat = 90
  let minLon = -180, maxLon = 180
  let hash = ''
  let even = true

  while (hash.length < 2) {
    if (even) {
      const mid = (minLon + maxLon) / 2
      if (lon >= mid) {
        hash += BASE32[16]  // placeholder bit
        minLon = mid
      } else {
        hash += BASE32[0]   // placeholder bit
        maxLon = mid
      }
    } else {
      const mid = (minLat + maxLat) / 2
      if (lat >= mid) {
        hash += BASE32[16]
        minLat = mid
      } else {
        hash += BASE32[0]
        maxLat = mid
      }
    }
    even = !even
  }

  // Convert the two placeholder bits into real geohash chars
  return encodeTwoChars(lat, lon)
}

function encodeTwoChars(lat, lon) {
  // Full geohash encode, then slice first 2 chars
  return encodeGeohash(lat, lon).slice(0, 2)
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
