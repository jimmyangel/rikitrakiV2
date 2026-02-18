import { constants } from '../config.js'

export async function activateUser(username, token) {
    const url = `${constants.APIV2_BASE_URL}/users/${encodeURIComponent(username)}/activation`

    try {
        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })

        // 204 — Success
        if (res.status === 204) {
            return { ok: true }
        }

        // 400 — Invalid input
        if (res.status === 400) {
            const text = await res.text()
            return { ok: false, error: text || 'Invalid input' }
        }

        // 401 — Unauthorized (expired or invalid token)
        if (res.status === 401) {
            const text = await res.text()
            return { ok: false, error: text || 'Unauthorized activation token' }
        }

        // 403 — Token mismatch
        if (res.status === 403) {
            const text = await res.text()
            return { ok: false, error: text || 'Activation token does not match this user' }
        }

        // 404 — User not found
        if (res.status === 404) {
            const text = await res.text()
            return { ok: false, error: text || 'User not found' }
        }

        // 500 — Server error
        if (res.status === 500) {
            const text = await res.text()
            return { ok: false, error: text || 'Server error' }
        }

        // Fallback for unexpected statuses
        const text = await res.text()
        return {
            ok: false,
            error: `Unexpected error (${res.status}): ${text}`
        }

    } catch (err) {
        return { ok: false, error: 'Network error' }
    }
}
