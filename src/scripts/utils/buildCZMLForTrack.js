import * as Cesium from 'cesium'
import { constants } from '../config.js'

export function buildCZMLForTrack(geojson, bounds, trackType) {
    const minSampleDistance = constants.MIN_SAMPLE_DISTANCE

    const fc = JSON.parse(JSON.stringify(geojson))

    // Assume exactly one valid LineString feature (legacy behavior)
    const feature = fc.features[0]
    const coords = feature.geometry.coordinates
    const times = feature.properties.coordTimes
	const trailheadHeight = coords[0][2]

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
				verticalOrigin: 'BOTTOM',
				heightReference: 'RELATIVE_TO_GROUND',
				disableDepthTestDistance: 1000000000
			},
			position: {
				cartographicDegrees: []
			}
		},
		{
			id: 'nw',
			description: 'invisible nw for camera fly',
			point: { color: { rgba: [0, 0, 0, 0] } },
			position: {
				cartographicDegrees: [
					bounds.west,
					bounds.north,
					trailheadHeight
				]
			}
		},
		{
			id: 'se',
			description: 'invisible se for camera fly',
			point: { color: { rgba: [0, 0, 0, 0] } },
			position: {
				cartographicDegrees: [
					bounds.east,
					bounds.south,
					trailheadHeight
				]
			}
		}
    ]

    function keepSample(i) {
        const t = times[i]
        const c = coords[i]
        czml[1].position.cartographicDegrees.push(t, c[0], c[1], c[2])
    }

    let last = 0
    keepSample(0)

    for (let i = 1; i < coords.length; i++) {
        const prev = Cesium.Cartesian3.fromDegrees(
            coords[last][0], coords[last][1], coords[last][2]
        )
        const curr = Cesium.Cartesian3.fromDegrees(
            coords[i][0], coords[i][1], coords[i][2]
        )

        if (Cesium.Cartesian3.distance(curr, prev) > minSampleDistance) {
            keepSample(i)
            last = i
        }
    }

    const firstTime = times[0]
    const lastTime = times[times.length - 1]

    czml[0].clock.interval = `${firstTime}/${lastTime}`
    czml[0].clock.currentTime = firstTime
    czml[1].availability = `${firstTime}/${lastTime}`

	const [lon, lat] = coords[0]
	czml[2].position.cartographicDegrees = [lon, lat, 2]

    return czml
}
