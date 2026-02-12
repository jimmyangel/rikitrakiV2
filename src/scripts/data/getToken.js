import { constants } from '../config.js'

export async function getToken(username, password) {
    const url = `${constants.APIV2_BASE_URL}/token`

    const headers = {
        'Authorization': 'Basic ' + btoa(`${username}:${password}`),
        'Content-Type': 'application/json'
    }

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers
        })

        // Known auth failures
        if (res.status === 401) {
            return {
                token: null,
                error: 'Invalid username or password'
            }
        }

        if (res.status === 403) {
            return {
                token: null,
                error: 'Your account exists but needs to be activated'
            }
        }

        // Any other non-OK status
        if (!res.ok) {
            return {
                token: null,
                error: `Server returned ${res.status}`
            }
        }

        const token = await res.text()

        if (!token) {
            return {
                token: null,
                error: 'No token returned by server'
            }
        }

        return {
            token,
            error: null
        }

    } catch (err) {
        return {
            token: null,
            error: err.message || 'Network error'
        }
    }
}
