import * as Cesium from 'cesium'
import { constants } from '../config.js'

export function buildCZMLForTrack(geojson, bounds, trackType) {
    const minSampleDistance = constants.MIN_SAMPLE_DISTANCE

    const fc = JSON.parse(JSON.stringify(geojson))

    fc.features = fc.features.filter(f =>
        f.geometry.type === 'LineString' &&
        Array.isArray(f.geometry.coordinates) &&
        f.geometry.coordinates[0].length >= 3
    )

    const start = new Date(2015, 0, 1)
    for (const feature of fc.features) {
        feature.properties.coordTimes = []
        let d = new Date(start)
        for (let i = 0; i < feature.geometry.coordinates.length; i++) {
            feature.properties.coordTimes.push(d.toISOString())
            d.setSeconds(d.getSeconds() + 10)
        }
    }

    const czml = [
        {
            id: 'document',
            name: 'Track CZML',
            version: '1.0',
            clock: {
                interval: '',
                currentTime: '',
                multiplier: 100,
                range: 'CLAMPED',
                step: 'SYSTEM_CLOCK_MULTIPLIER'
            }
        },
        {
            id: 'track',
            availability: '',
            path: {
                material: {
                    polylineOutline: {
                        color: {
                            rgba: Cesium.Color
                                .fromCssColorString(constants.INSIDE_TRACK_COLOR)
                                .withAlpha(1.0)
                                .toBytes()
                        },
                        outlineColor: {
                            rgba: Cesium.Color
                                .fromCssColorString(constants.TRACK_COLOR)
                                .withAlpha(1.0)
                                .toBytes()
                        },
                        outlineWidth: 5
                    }
                },
                width: 7,
                leadTime: 0
            },
            billboard: {
                image: 'images/marker.png',
                verticalOrigin: 'BOTTOM',
                show: false
            },
            position: {
                cartographicDegrees: []
            },
            viewFrom: { cartesian: [0, -1000, 300] }
        },
        {
            id: 'trailhead',
            description: 'trailhead marker',
            billboard: {
                image: `images/${trackType ? trackType.toLowerCase() : 'hiking'}.png`,
                verticalOrigin: 'BOTTOM'
            },
            position: { cartographicDegrees: [] }
        },
        {
            id: 'nw',
            description: 'invisible nw for camera fly',
            point: {
                color: { rgba: [0, 0, 0, 0] }
            },
            position: {
                cartographicDegrees: [
                    bounds.west,
                    bounds.north,
                    0
                ]
            }
        },
        {
            id: 'se',
            description: 'invisible se for camera fly',
            point: {
                color: { rgba: [0, 0, 0, 0] }
            },
            position: {
                cartographicDegrees: [
                    bounds.east,
                    bounds.south,
                    0
                ]
            }
        }
    ]

    function keepSample(featureIndex, coordIndex) {
        const f = fc.features[featureIndex]
        const t = f.properties.coordTimes[coordIndex]
        const c = f.geometry.coordinates[coordIndex]

        czml[1].position.cartographicDegrees.push(
            t,
            c[0],
            c[1],
            c[2]
        )
    }

    for (let j = 0; j < fc.features.length; j++) {
        const coords = fc.features[j].geometry.coordinates
        let last = 0

        keepSample(j, 0)

        for (let i = 1; i < coords.length; i++) {
            const prev = Cesium.Cartesian3.fromDegrees(
                coords[last][0], coords[last][1], coords[last][2]
            )
            const curr = Cesium.Cartesian3.fromDegrees(
                coords[i][0], coords[i][1], coords[i][2]
            )

            if (Cesium.Cartesian3.distance(curr, prev) > minSampleDistance) {
                keepSample(j, i)
                last = i
            }
        }
    }

    const first = fc.features[0].properties.coordTimes[0]
    const lastFeature = fc.features[fc.features.length - 1]
    const lastIndex = lastFeature.properties.coordTimes.length - 1
    const lastTime = lastFeature.properties.coordTimes[lastIndex]

    czml[0].clock.interval = `${first}/${lastTime}`
    czml[0].clock.currentTime = first
    czml[1].availability = `${first}/${lastTime}`

    const firstCoord = fc.features[0].geometry.coordinates[0]
    czml[2].position.cartographicDegrees = firstCoord

    return czml
}
