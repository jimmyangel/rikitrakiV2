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

    // DISTANCE FORMATTER
    Alpine.magic('formatDistance', () => value => {
        const store = Alpine.store('tracks')
        const isUS = store.countryCode === 'US'

        if (isUS) {
            const miles = value * 0.621371
            return miles.toFixed(2) + ' mi'
        }

        return value.toFixed(2) + ' km'
    })

    // ELEVATION FORMATTER
    Alpine.magic('formatElevation', () => value => {
        const store = Alpine.store('tracks')
        const isUS = store.countryCode === 'US'

        if (isUS) {
            const feet = value * 3.28084
            return Math.round(feet) + ' ft'
        }

        return Math.round(value) + ' m'
    })
}
