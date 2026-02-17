import { constants } from '../config.js'

export async function updateUserProfile(username, token, newPassword) {
    const url = `${constants.APIV2_BASE_URL}/users/${username}`

    try {
        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: newPassword })
        })

        // 204 — Success
        if (res.status === 204) {
            return { ok: true }
        }

        // 400 — Invalid input
        if (res.status === 400) {
            const text = await res.text()
            return {
                ok: false,
                error: text || 'Invalid input'
            }
        }

        // 401 — Unauthorized (bad token)
        if (res.status === 401) {
            return {
                ok: false,
                error: 'Unauthorized — invalid or expired reset token'
            }
        }

        // 500 — Server error
        if (res.status === 500) {
            const text = await res.text()
            return {
                ok: false,
                error: text || 'Server error'
            }
        }

        // Fallback for unexpected statuses
        const text = await res.text()
        return {
            ok: false,
            error: `Unexpected error (${res.status}): ${text}`
        }

    } catch (err) {
        return {
            ok: false,
            error: 'Network error'
        }
    }
}
