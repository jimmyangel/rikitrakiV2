export function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371 // km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2

    return 2 * R * Math.asin(Math.sqrt(a))
}

export async function getApproxLocation() {
    // 1. Primary: ipapi.co (most reliable)
    try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
            const data = await res.json();
            if (data && data.latitude && data.longitude) {
                return {
                    lat: data.latitude,
                    lon: data.longitude,
                    countryCode: data.country_code || 'US'
                }
            }
        }
    } catch (e) {
        console.warn('ipapi.co failed', e)
    }

    // 2. Fallback: ipwho.is (fast + simple)
    try {
        const res = await fetch('https://ipwho.is/');
        if (res.ok) {
            const data = await res.json();
            if (data && data.latitude && data.longitude) {
                return {
                    lat: data.latitude,
                    lon: data.longitude,
                    countryCode: data.country_code || 'US'
                }
            }
        }
    } catch (e) {
        console.warn('ipwho.is failed', e)
    }

    // 3. Final fallback: your default location (Portland)
    return {
        lat: 45.5152,
        lon: -122.6784,
        countryCode: 'US'
    }
}


