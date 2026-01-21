export default function (Alpine) {
    Alpine.data('descWidthController', (short, medium) => ({
        thresholds: { short, medium },
        descWidthClass(d) {
            const len = d?.length || 0
            if (len < this.thresholds.short) return 'desc-w-short'
            if (len < this.thresholds.medium) return 'desc-w-medium'
            return 'desc-w-long'
        }
    }))
}
