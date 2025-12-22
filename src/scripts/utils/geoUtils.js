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
