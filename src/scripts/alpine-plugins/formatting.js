export default function (Alpine) {

    // DESCRIPTION WIDTH CONTROLLER
    Alpine.data('descWidthController', (short, medium) => ({
        thresholds: { short, medium },
        descWidthClass(d) {
            const len = d?.length || 0
            if (len < this.thresholds.short) return 'desc-w-short'
            if (len < this.thresholds.medium) return 'desc-w-medium'
            return 'desc-w-long'
        }
    }))

    function convertDistance(km, isUS) {
        return isUS ? km * 0.621371 : km
    }

    function convertElevation(m, isUS) {
        return isUS ? m * 3.28084 : m
    }

    Alpine.magic('formatDistanceNumber', () => value => {
        const isUS = Alpine.store('tracks').countryCode === 'US'
        const local = convertDistance(value, isUS)
        return local.toFixed(2)
    })

    Alpine.magic('formatElevationNumber', () => value => {
        const isUS = Alpine.store('tracks').countryCode === 'US'
        const local = convertElevation(value, isUS)
        return Math.round(local)
    })

    Alpine.magic('formatDistanceLabel', () => value => {
        const isUS = Alpine.store('tracks').countryCode === 'US'
        const local = convertDistance(value, isUS)
        return isUS ? `${local.toFixed(2)} mi` : `${local.toFixed(2)} km`
    })

    Alpine.magic('formatElevationLabel', () => value => {
        const isUS = Alpine.store('tracks').countryCode === 'US'
        const local = convertElevation(value, isUS)
        return isUS ? `${Math.round(local)} ft` : `${Math.round(local)} m`
    })


}
