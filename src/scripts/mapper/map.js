import { createViewer } from '../mapper/viewer.js'
import * as Cesium from 'cesium'

let viewer = null
let trackDataSource = null

// Track the currently selected marker's world position
let selectedEntityPosition = null

export function initMap() {
    viewer = createViewer()

    const popup = document.getElementById('trackPopUp')

	viewer.scene.postRender.addEventListener(() => {
		const popup = document.querySelector('#trackPopUpContent')
		if (!popup) return

		const selected = Alpine.store('tracks').selected
		if (!selected || !selectedEntityPosition) return

		const windowPos = Cesium.SceneTransforms.worldToWindowCoordinates(
			viewer.scene,
			selectedEntityPosition
		)

		if (!windowPos) return

		popup.style.left = `${windowPos.x}px`
		popup.style.top = `${windowPos.y}px`
	})




}

export function setTracks(tracks) {
    if (!viewer) {
        console.warn('setTracks called before initMap()')
        return
    }

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
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
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

        selectedEntityPosition = Cesium.Property.getValueOrUndefined(
            entity.position,
            viewer.clock.currentTime
        )

        console.log('Popup world position:', selectedEntityPosition)
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    viewer.dataSources.add(trackDataSource)

    viewer.flyTo(trackDataSource)

    console.log(`Added ${tracks.length} markers`)
}
