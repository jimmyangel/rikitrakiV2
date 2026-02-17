import { constants } from '../config.js'

export async function updateUserProfile(username, currentPassword, newPassword) {
    const url = `${constants.APIV2_BASE_URL}/users/me`

    // Basic Auth: base64("username:currentPassword")
    const basic = btoa(`${username}:${currentPassword}`)

    try {
        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Basic ${basic}`,
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

        // 401 — Unauthorized (wrong current password)
        if (res.status === 401) {
            return {
                ok: false,
                error: 'Incorrect current password'
            }
        }

        // 404 — User not found
        if (res.status === 404) {
            return {
                ok: false,
                error: 'User not found'
            }
        }

        // 422 — Duplicate (unlikely for password)
        if (res.status === 422) {
            const text = await res.text()
            return {
                ok: false,
                error: text || 'Duplicate value'
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
