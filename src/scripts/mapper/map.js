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
				//heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
				//verticalOrigin: Cesium.VerticalOrigin.CENTER,
				heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
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

	trackDataSource.clustering.clusterEvent.addEventListener((entities, cluster) => {
		const count = entities.length

		// Choose color
		let color = '#2ecc71'
		if (count >= 10 && count < 50) color = '#f39c12'
		if (count >= 50) color = '#e74c3c'

		// Generate icon
		const icon = createClusterIcon(count, color)

		// Apply icon
		cluster.billboard.show = true
		cluster.billboard.image = icon
		cluster.billboard.scale = 1.0
		cluster.billboard.verticalOrigin = Cesium.VerticalOrigin.CENTER
		cluster.billboard.heightReference = Cesium.HeightReference.RELATIVE_TO_GROUND

		// Prevent cluster from sinking into terrain
    	cluster.billboard.disableDepthTestDistance = Number.POSITIVE_INFINITY

		// Hide default label
		cluster.label.show = false
	})


	trackDataSource.clustering.enabled = true
	trackDataSource.clustering.pixelRange = 80
	trackDataSource.clustering.minimumClusterSize = 2

    viewer.dataSources.add(trackDataSource)

	viewer.flyTo(trackDataSource)

    console.log(`Added ${tracks.length} markers`)
}

function createClusterIcon(count, color) {
    const size = 40
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.fillStyle = 'white'
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(count, size/2, size/2)
    return canvas.toDataURL()
}

