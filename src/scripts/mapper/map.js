import { createViewer } from '../mapper/viewer.js'
import * as Cesium from 'cesium'

let viewer = null
let trackDataSource = null

let savedEntity = null

// Entity screen position at click time
let anchorEntityScreenPos = null

// Popup screen position at click time
let anchorPopupPos = null

export function initMap() {

	// Start spinner
	Alpine.store('tracks').loadingCesium = true
	viewer = createViewer()

	const wrapper = document.querySelector('.map-touch-wrapper')

	// Handle mobile scrolling through map
	if (window.matchMedia('(max-width: 768px)').matches) {
		const wrapper = document.querySelector('.map-touch-wrapper')
		const hint = wrapper.querySelector('.map-interact-hint')

		// Tap the hint → activate map
		hint.addEventListener('touchstart', (e) => {
			e.stopPropagation() // prevent bubbling to wrapper
			wrapper.classList.add('map-active')
		})

		// Tap outside → deactivate map
		document.addEventListener('touchstart', (e) => {
			if (!wrapper.contains(e.target)) {
				wrapper.classList.remove('map-active')
			}
		})
	}

	//
	// POST-RENDER: move popup by screen-space delta of entity position
	//
	viewer.scene.postRender.addEventListener(() => {
		if (!savedEntity || !anchorEntityScreenPos || !anchorPopupPos) return

		const popup = document.querySelector('#trackPopUp')
		if (!popup) return

		const time = viewer.clock.currentTime
		const worldPos = savedEntity.position.getValue(time)
		if (!worldPos) return

		const newScreenPos = Cesium.SceneTransforms.worldToWindowCoordinates(
			viewer.scene,
			worldPos
		)
		if (!newScreenPos) return

		const dx = newScreenPos.x - anchorEntityScreenPos.x
		const dy = newScreenPos.y - anchorEntityScreenPos.y

		popup.style.left = `${anchorPopupPos.x + dx}px`
		popup.style.top  = `${anchorPopupPos.y + dy}px`
	})

	// Stop spinner when ready
	viewer.scene.globe.tileLoadProgressEvent.addEventListener((pending) => {
		if (pending === 0) {
			Alpine.store('tracks').loadingCesium = false
		}
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

  const entities = []
  const cartographics = []

  //
  // Add markers
  //
  for (const track of tracks) {
    if (!track.trackLatLng[1] || !track.trackLatLng[0]) continue

    const entity = trackDataSource.entities.add({
      id: track.trackId,
      name: track.trackId,
      position: Cesium.Cartesian3.fromDegrees(
        track.trackLatLng[1],
        track.trackLatLng[0]
      ),
      billboard: {
        image: '/images/l-marker.png',
        scale: 0.8,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      properties: {
        track
      }
    })

    entities.push(entity)
    cartographics.push(
      Cesium.Cartographic.fromDegrees(
        track.trackLatLng[1],
        track.trackLatLng[0]
      )
    )
  }

  //
  // TERRAIN SAMPLING
  //
  if (cartographics.length > 0) {
    Cesium.sampleTerrain(viewer.terrainProvider, 14, cartographics).then(
      (updated) => {
        for (let i = 0; i < updated.length; i++) {
          const c = updated[i]
          const e = entities[i]
          e.position = new Cesium.ConstantPositionProperty(
            Cesium.Cartesian3.fromRadians(c.longitude, c.latitude, c.height)
          )
        }
      }
    )
  }

  //
  // HOVER CURSOR — clean Cesium-native version
  //
  let isPointer = false

  viewer.screenSpaceEventHandler.setInputAction((movement) => {
    const picked = viewer.scene.pick(movement.endPosition)

    const shouldBePointer =
      picked &&
      picked.id instanceof Cesium.Entity &&
      picked.id.properties &&
      picked.id.properties.track

    if (shouldBePointer && !isPointer) {
      isPointer = true
      viewer.canvas.style.cursor = 'pointer'
    } else if (!shouldBePointer && isPointer) {
      isPointer = false
      viewer.canvas.style.cursor = 'default'
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

  //
  // CLICK HANDLER — anchor popup
  //
viewer.screenSpaceEventHandler.setInputAction((movement) => {
  const pickedArray = viewer.scene.drillPick(movement.position)

  const pickedTracks = pickedArray
    .map(p => p.id)
    .filter(id =>
      id instanceof Cesium.Entity &&
      id.properties &&
      id.properties.track
    )

  if (pickedTracks.length === 0) return

  const linkContainer = document.querySelector('#trackPopUpLink')
  linkContainer.innerHTML = ''

  for (const entity of pickedTracks) {
    const track = entity.properties.track.getValue()
    const div = document.createElement('div')
    div.textContent = track.trackName
    linkContainer.appendChild(div)
  }

  // Tell Alpine to show the popup
  Alpine.store('tracks').selected = { multi: true }

  // Anchor popup to first entity
  savedEntity = pickedTracks[0]

  const time = viewer.clock.currentTime
  const worldPos = savedEntity.position.getValue(time)
  const entityScreenPos = Cesium.SceneTransforms.worldToWindowCoordinates(
    viewer.scene,
    worldPos
  )

  anchorEntityScreenPos = {
    x: entityScreenPos.x,
    y: entityScreenPos.y
  }

  anchorPopupPos = {
    x: movement.position.x,
    y: movement.position.y
  }

  const popup = document.querySelector('#trackPopUp')
  popup.style.left = `${anchorPopupPos.x}px`
  popup.style.top  = `${anchorPopupPos.y}px`
}, Cesium.ScreenSpaceEventType.LEFT_CLICK)


  viewer.dataSources.add(trackDataSource)
  viewer.flyTo(trackDataSource)

  console.log(`Added ${tracks.length} markers`)
}
