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
  viewer = createViewer()

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
  // Add markers (legacy-style: simple billboard, no clamp/verticalOrigin)
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
  // Legacy-style terrain sampling to set explicit height
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
  // CLICK HANDLER — anchor to click + entity screen position
  //
  viewer.screenSpaceEventHandler.setInputAction((movement) => {
    const picked = viewer.scene.pick(movement.position)
    if (!picked || !(picked.id instanceof Cesium.Entity)) return

    const entity = picked.id
    if (!entity.properties || !entity.properties.track) return

    const track = entity.properties.track.getValue()
    Alpine.store('tracks').selectTrack(track)

    savedEntity = entity

    const time = viewer.clock.currentTime
    const worldPos = entity.position.getValue(time)
    if (!worldPos) return

    const entityScreenPos = Cesium.SceneTransforms.worldToWindowCoordinates(
      viewer.scene,
      worldPos
    )
    if (!entityScreenPos) return

    anchorEntityScreenPos = {
      x: entityScreenPos.x,
      y: entityScreenPos.y
    }

    const popup = document.querySelector('#trackPopUp')
    popup.style.display = 'block'

    // Anchor popup at click position (legacy behavior)
    anchorPopupPos = {
      x: movement.position.x,
      y: movement.position.y
    }

    popup.style.left = `${anchorPopupPos.x}px`
    popup.style.top  = `${anchorPopupPos.y}px`
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

  viewer.dataSources.add(trackDataSource)
  viewer.flyTo(trackDataSource)

  console.log(`Added ${tracks.length} markers`)
}
