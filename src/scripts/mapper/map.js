import { createViewer } from '../mapper/viewer.js'
import * as Cesium from 'cesium'
import { constants } from '../config.js'

let viewer = null
let searchCenterEntity = null

let trackDataSource = null

let savedEntity = null

let anchorEntityScreenPos = null
let anchorPopupPos = null

// Only one animated CZML track at a time (legacy behavior)
let activeTrackDataSource = null

export function initMap() {

    Alpine.store('tracks').loadingCesium = true
    viewer = createViewer()

    const wrapper = document.querySelector('.map-touch-wrapper')

    if (window.matchMedia('(max-width: 768px)').matches) {
        const wrapper = document.querySelector('.map-touch-wrapper')
        const hint = wrapper.querySelector('.map-interact-hint')

        hint.addEventListener('touchstart', (e) => {
            e.stopPropagation()
            wrapper.classList.add('map-active')
        })

        document.addEventListener('touchstart', (e) => {
            if (!wrapper.contains(e.target)) {
                wrapper.classList.remove('map-active')
            }
        })
    }

    let pressTimer = null
    let startPos = null
    let cameraMoved = false
    let lastCameraPos = null
    const MOVE_THRESHOLD = 8

    viewer.scene.postRender.addEventListener(() => {
        const cam = viewer.camera.positionWC
        if (lastCameraPos) {
            if (!Cesium.Cartesian3.equals(cam, lastCameraPos)) {
                cameraMoved = true
            }
        }
        lastCameraPos = Cesium.Cartesian3.clone(cam)
    })

    viewer.screenSpaceEventHandler.setInputAction((click) => {
        cameraMoved = false
        startPos = click.position

        pressTimer = setTimeout(() => {
            if (!cameraMoved) {
                handleLongPress(click.position)
            }
        }, 500)
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN)

    viewer.screenSpaceEventHandler.setInputAction(() => {
        clearTimeout(pressTimer)
    }, Cesium.ScreenSpaceEventType.LEFT_UP)

    viewer.screenSpaceEventHandler.setInputAction((movement) => {
        if (!startPos) return

        const dx = movement.endPosition.x - startPos.x
        const dy = movement.endPosition.y - startPos.y

        if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
            clearTimeout(pressTimer)
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

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

    viewer.scene.globe.tileLoadProgressEvent.addEventListener((pending) => {
        if (pending === 0) {
            Alpine.store('tracks').loadingCesium = false
        }
    })
}

export function setSearchCenter(lat, lon) {
    if (!viewer) return

    if (searchCenterEntity) {
        viewer.entities.remove(searchCenterEntity)
    }

    searchCenterEntity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat),
        point: {
            pixelSize: 12,
            translucent: true,
            color: Cesium.Color.fromCssColorString('#e38b2c').withAlpha(0.9),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
    })
}

export function applyFilter(filteredIds) {
    const entities = trackDataSource.entities.values

    for (const entity of entities) {
        entity.show = filteredIds.has(entity.id)
    }
}

export async function setTracks(tracks) {
    if (!viewer) {
        console.warn('setTracks called before initMap()')
        return
    }

    while (!viewer.terrainProvider) {
        await new Promise(r => setTimeout(r, 10))
    }

    await viewer.terrainProvider.readyPromise

    if (trackDataSource) {
        viewer.dataSources.remove(trackDataSource)
    }

    trackDataSource = new Cesium.CustomDataSource('tracks')

    const entities = []
    const cartographics = []

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
            properties: { track }
        })

        entities.push(entity)

        cartographics.push(
            Cesium.Cartographic.fromDegrees(
                track.trackLatLng[1],
                track.trackLatLng[0]
            )
        )
    }

    if (cartographics.length > 0) {
        const updated = await Cesium.sampleTerrain(
            viewer.terrainProvider,
            14,
            cartographics
        )

        for (let i = 0; i < updated.length; i++) {
            const c = updated[i]
            const e = entities[i]

            e.position = new Cesium.ConstantPositionProperty(
                Cesium.Cartesian3.fromRadians(
                    c.longitude,
                    c.latitude,
                    c.height
                )
            )
        }
    }

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
            const a = document.createElement('a')
            a.href = '#'
            a.className = 'popup-track-link'
            a.dataset.trackId = track.trackId
            a.textContent = track.trackName
            linkContainer.appendChild(a)
        }

        Alpine.store('tracks').selected = { multi: true }

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

function handleLongPress(position) {
    if (!viewer) return

    const scene = viewer.scene
    const ellipsoid = scene.globe.ellipsoid

    const cartesian = viewer.camera.pickEllipsoid(position, ellipsoid)
    if (!cartesian) return

    const cartographic = Cesium.Cartographic.fromCartesian(cartesian)

    const lat = Cesium.Math.toDegrees(cartographic.latitude)
    const lon = Cesium.Math.toDegrees(cartographic.longitude)

    const store = Alpine.store('tracks')
    store.lat = lat
    store.lon = lon

    setSearchCenter(lat, lon)

    store.reload()
}

/*
    Legacy behavior: only one CZML track at a time.
*/
export async function loadTrackCZML(czml) {
    if (!viewer) return null

    if (activeTrackDataSource) {
        viewer.dataSources.remove(activeTrackDataSource)
        activeTrackDataSource = null
    }

    const ds = await Cesium.CzmlDataSource.load(czml)
    viewer.dataSources.add(ds)
    activeTrackDataSource = ds

    return ds
}

export function flyToActiveTrack() {
    if (!viewer || !activeTrackDataSource) return

    viewer.flyTo(activeTrackDataSource)
}

export function setClockToEnd(ds) {
    if (!viewer || !ds || !ds.clock) return

    const clock = ds.clock

    viewer.clock.startTime = clock.startTime
    viewer.clock.stopTime = clock.stopTime

    // Move to the end so the full track is visible
    viewer.clock.currentTime = clock.stopTime

    viewer.clock.multiplier = 0
    viewer.clock.shouldAnimate = false
}


export function syncClockToCZML(ds) {
    if (!viewer || !ds || !ds.clock) return

    const clock = ds.clock

    viewer.clock.startTime = clock.startTime
    viewer.clock.stopTime = clock.stopTime
    viewer.clock.currentTime = clock.currentTime
    viewer.clock.multiplier = clock.multiplier
    viewer.clock.shouldAnimate = true
}

export function hideSearchMarker(trackId) {
    if (!trackDataSource) return
    const e = trackDataSource.entities.getById(trackId)
    if (e && e.billboard) e.billboard.show = false
}

export function showSearchMarker(trackId) {
    if (!trackDataSource) return
    const e = trackDataSource.entities.getById(trackId)
    if (e && e.billboard) e.billboard.show = true
}

