import { constants } from '../config.js'

export async function getTrackDetails(trackId) {
  const base = constants.APIV2_BASE_URL

  const detailsUrl = `${base}/tracks/${trackId}`
  const gpxUrl     = `${base}/tracks/${trackId}/GPX`
  const geotagsUrl = `${base}/tracks/${trackId}/geotags`

  const [details, gpxBlob, geotags] = await Promise.all([
    fetch(detailsUrl).then(res => {
      if (!res.ok) {
        throw new Error(`getTrackDetails details failed: ${res.status} ${res.statusText}`)
      }
      return res.json()
    }),
    fetch(gpxUrl).then(res => {
      if (!res.ok) {
        throw new Error(`getTrackDetails gpx failed: ${res.status} ${res.statusText}`)
      }
      return res.blob()
    }),
    fetch(geotagsUrl).then(res => {
      if (!res.ok) {
        throw new Error(`getTrackDetails geotags failed: ${res.status} ${res.statusText}`)
      }
      return res.json()
    })
  ])

  return { details, gpxBlob, geotags }
}



