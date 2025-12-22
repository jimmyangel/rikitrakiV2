import { constants } from '../config.js'

export async function getTrackInfo(filter = null) {
    const params = new URLSearchParams({ proj: 'small' })

    if (filter) {
        params.set('filter', filter)
    }

    const url = `${constants.APIV2_BASE_URL}/tracks?${params.toString()}`

    const res = await fetch(url)

    if (!res.ok) {
        throw new Error(`getTrackInfo failed: ${res.status} ${res.statusText}`)
    }

    return res.json()
}