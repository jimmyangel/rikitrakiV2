import { createViewer } from '../mapper/viewer.js'
import * as Cesium from 'cesium'

let viewer = null
let trackDataSource = null

export function initMap() {
    viewer = createViewer()
}

export function setTracks(tracks) {
    if (!viewer) {
        console.warn('setTracks called before initMap()')
        return
    }

    // Remove old markers if they exist
    if (trackDataSource) {
        viewer.dataSources.remove(trackDataSource)
    }

    trackDataSource = new Cesium.CustomDataSource('tracks')

    for (const track of tracks) {
        if (!track.trackLatLng[1] || !track.trackLatLng[0]) continue

        trackDataSource.entities.add({
            id: track.trackId,
            position: Cesium.Cartesian3.fromDegrees(track.trackLatLng[1], track.trackLatLng[0]),
			billboard: { 
				image: '/images/l-marker.png', 
				scale: 0.8, 
				//verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
				heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
				//verticalOrigin: Cesium.VerticalOrigin.CENTER,
				//heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
				pixelOffset: new Cesium.Cartesian2(0, -6)
			},
            properties: {
                track
            }
        })
    }

	viewer.screenSpaceEventHandler.setInputAction((movement) => {
		const picked = viewer.scene.pick(movement.position)
		if (!picked || !picked.id) return

		const entity = picked.id
		if (!entity.properties || !entity.properties.track) return

		const track = entity.properties.track.getValue()
		Alpine.store('tracks').selectTrack(track)
		console.log('Selected track:', track)
	}, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    viewer.dataSources.add(trackDataSource)

	viewer.flyTo(trackDataSource)

    console.log(`Added ${tracks.length} markers`)
}

