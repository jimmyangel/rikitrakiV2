import { constants } from '../config.js'

export async function createUser(username, email, password, rturl) {
	console.log('create user', username, email, password, rturl)
    const url = `${constants.APIV2_BASE_URL}/users`

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password, rturl })
        })

        // 201 — Success
        if (res.status === 201) {
            const data = await res.json().catch(() => ({}))
            return {
                ok: true,
                message: data.message || 'Verification email sent'
            }
        }

        // 400 — Invalid input
        if (res.status === 400) {
            const text = await res.text()
            return {
                ok: false,
                error: text || 'Invalid input'
            }
        }

        // 422 — Duplicate username or email
        if (res.status === 422) {
            const text = await res.text()
            return {
                ok: false,
                error: text || 'Username or email already exists'
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
