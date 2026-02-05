import * as Cesium from 'cesium'

export function wireNorthArrowControl(viewer) {
    const el = document.getElementById('alignNorth')
    if (!el) return

    const svg = el.querySelector('svg')
    if (!svg) return

    svg.style.transformOrigin = '50% 50%'

    // Smooth rotation every frame
    viewer.scene.postRender.addEventListener(() => {
        const heading = viewer.camera.heading
        const deg = -Cesium.Math.toDegrees(heading)
        svg.style.transform = `rotate(${deg}deg)`
    })

    el.addEventListener('click', e => {
        e.preventDefault()

        const camera = viewer.camera

        // Keep the camera EXACTLY where it is
        const destination = Cesium.Cartesian3.clone(camera.positionWC)

        // Rotate the GLOBE by setting heading = 0
        viewer.camera.flyTo({
            destination,
            orientation: {
                heading: 0,
                pitch: camera.pitch,
                roll: camera.roll
            },
            duration: 0.6,
            easingFunction: Cesium.EasingFunction.QUADRATIC_OUT
        })
    })
}
