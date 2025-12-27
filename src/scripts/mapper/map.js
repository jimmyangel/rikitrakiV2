import { createViewer } from '../mapper/viewer.js'
import * as Cesium from 'cesium'

let viewer = null
let trackDataSource = null

let savedEntity = null

export function initMap() {
    viewer = createViewer()

	viewer.scene.postRender.addEventListener(() => {
		const popup = document.querySelector('#trackPopUp')
		if (!popup || !savedEntity) return

		const time = viewer.clock.currentTime
		const worldPos = savedEntity.position.getValue(time)
		if (!worldPos) return

		const projected = Cesium.SceneTransforms.worldToWindowCoordinates(
			viewer.scene,
			worldPos
		)
		if (!projected) return

		// Anchor popup to the marker, but let CSS handle “above”
		popup.style.left = `${projected.x}px`
		popup.style.top = `${projected.y}px`
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
                pixelOffset: new Cesium.Cartesian2(0, -6),
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM
            },
            properties: {
                track
            }
        })
    }

    // CLICK HANDLER — using drillPick (reliable)
    viewer.screenSpaceEventHandler.setInputAction((movement) => {

        const hits = viewer.scene.drillPick(movement.position)
        if (!hits || hits.length === 0) return

        const hit = hits.find(h => h.id instanceof Cesium.Entity)
        if (!hit) return

        const entity = hit.id
        if (!entity.properties || !entity.properties.track) return

        const track = entity.properties.track.getValue()
        Alpine.store('tracks').selectTrack(track)

        savedEntity = entity

        // Show popup immediately
        const popup = document.querySelector('#trackPopUp')
        popup.style.display = 'block'
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    viewer.dataSources.add(trackDataSource)
    viewer.flyTo(trackDataSource)

    console.log(`Added ${tracks.length} markers`)
}
