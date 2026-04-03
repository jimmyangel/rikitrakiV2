import { constants } from '../config.js'

export async function getTrackDetails(trackId) {
  const base = constants.APIV2_BASE_URL
  const s3   = constants.S3_BASE_URL

  const detailsUrl = `${base}/tracks/${trackId}`
  const geotagsUrl = `${base}/tracks/${trackId}/geotags`

  // 1. Fetch details first (we need details.trackGPX)
  const details = await fetch(detailsUrl).then(res => {
    if (!res.ok) {
      throw new Error(`getTrackDetails details failed: ${res.status} ${res.statusText}`)
    }
    return res.json()
  })

  // 2. Build S3 GPX URL using the original filename
  const gpxUrl = `${s3}/${trackId}/gpx/${details.trackGPX}`

  // 3. Fetch GPX directly from S3
  const gpxBlob = await fetch(gpxUrl).then(res => {
    if (!res.ok) {
      throw new Error(`getTrackDetails gpx failed: ${res.status} ${res.statusText}`)
    }
    return res.blob()
  })

  // 4. Fetch geotags (still from API)
  let geotags = []
  if (details.hasPhotos) {
    const res = await fetch(geotagsUrl)
    if (res.ok) {
      geotags = await res.json()
    } else if (res.status !== 404) {
      throw new Error(`getTrackDetails geotags failed: ${res.status} ${res.statusText}`)
    }
  }

  return { details, gpxBlob, geotags }
}
