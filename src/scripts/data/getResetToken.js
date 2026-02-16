import { constants } from '../config.js'

export async function getResetToken(email) {
    const rturl = `${window.location.protocol}//${window.location.host}/`

    const url =
        `${constants.APIV2_BASE_URL}/resettoken` +
        `?email=${encodeURIComponent(email)}` +
        `&rturl=${encodeURIComponent(rturl)}`

    try {
        const res = await fetch(url)

        if (res.status === 400) {
            return { ok: false, error: 'Invalid email address' }
        }

        if (res.status === 404) {
            return { ok: false, error: 'No user found with that email' }
        }

        if (res.status === 500) {
            return { ok: false, error: 'Server error while processing reset request' }
        }

        if (!res.ok) {
            return { ok: false, error: `Server returned ${res.status}` }
        }

        const data = await res.json()

        if (!data.message) {
            return { ok: false, error: 'Unexpected server response' }
        }

        return { ok: true, message: data.message }

    } catch (err) {
        return { ok: false, error: err.message || 'Network error' }
    }
}
