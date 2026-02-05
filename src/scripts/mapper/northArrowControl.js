import * as Cesium from 'cesium'

export function wireNorthArrowControl(viewer) {
    const el = document.getElementById('alignNorth')
    if (!el) return

    const svg = el.querySelector('svg')
    if (!svg) return

    svg.style.transformOrigin = '50% 50%'

    viewer.scene.postRender.addEventListener(() => {
        const heading = viewer.camera.heading
        const deg = -Cesium.Math.toDegrees(heading)
        svg.style.transform = `rotate(${deg}deg)`
    })

    el.addEventListener('click', () => {
        const camera = viewer.camera
        const scene = viewer.scene

        const ray = new Cesium.Ray(camera.positionWC, camera.directionWC)
        const target = scene.globe.pick(ray, scene)
        if (!target) return

        const initialHeading = camera.heading
        const currentPitch = camera.pitch
        const currentRange = Cesium.Cartesian3.distance(camera.positionWC, target)

        const initialRemaining = Cesium.Math.negativePiToPi(0 - initialHeading)

        if (Math.abs(initialRemaining) < Cesium.Math.toRadians(1)) {
            return
        }

        const transform = Cesium.Transforms.eastNorthUpToFixedFrame(target)

        camera.lookAtTransform(
            transform,
            new Cesium.HeadingPitchRange(initialHeading, currentPitch, currentRange)
        )

        const direction = initialRemaining > 0 ? -1 : 1
        const speed = 0.06 * direction

        let accumulated = 0

        function orbitTick(clock) {
            const remaining = Math.abs(initialRemaining) - Math.abs(accumulated)

            if (remaining <= Cesium.Math.toRadians(0.5)) {
                viewer.clock.onTick.removeEventListener(orbitTick)

                camera.lookAtTransform(
                    transform,
                    new Cesium.HeadingPitchRange(0, currentPitch, currentRange)
                )

                camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
                return
            }

            camera.rotateRight(speed)
            accumulated += speed
        }

        viewer.clock.onTick.addEventListener(orbitTick)
    })
}
