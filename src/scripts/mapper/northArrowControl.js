import * as Cesium from 'cesium'

export function wireNorthArrowControl(viewer) {
    const el = document.getElementById('alignNorth')
    if (!el) return

    const svg = el.querySelector('svg')
    if (!svg) return

    svg.style.transformOrigin = '50% 50%'

    // Keep arrow synced to camera heading
    viewer.scene.postRender.addEventListener(() => {
        const heading = viewer.camera.heading
        const deg = -Cesium.Math.toDegrees(heading)
        svg.style.transform = `rotate(${deg}deg)`
    })

    el.addEventListener('click', () => {
        const camera = viewer.camera
        const scene = viewer.scene

        // 1. Find the ground point the camera is looking at
        const ray = new Cesium.Ray(camera.positionWC, camera.directionWC)
        const target = scene.globe.pick(ray, scene)
        if (!target) return

        // 2. Capture current HPR relative to that target
        const currentHeading = camera.heading
        const currentPitch = camera.pitch
        const currentRange = Cesium.Cartesian3.distance(camera.positionWC, target)

		// If already pointing north, do nothing
		if (Math.abs(Cesium.Math.negativePiToPi(currentHeading)) < Cesium.Math.toRadians(1)) {
			return
		}

        // 3. Build ENU transform at the target
        const transform = Cesium.Transforms.eastNorthUpToFixedFrame(target)

        // 4. Lock camera into constrained orbit mode
        camera.lookAtTransform(
            transform,
            new Cesium.HeadingPitchRange(currentHeading, currentPitch, currentRange)
        )

        // 5. Compute shortest direction to rotate toward heading = 0
        const delta = Cesium.Math.negativePiToPi(0 - currentHeading)
        const direction = delta > 0 ? -1 : 1   // rotateRight is negative heading

        // 6. Orbit speed (radians per tick)
        const speed = 0.02 * direction

        // 7. Define the tick handler as a named function
        function orbitTick(clock) {
            // Rotate a little each frame
            camera.rotateRight(speed)

            // Check heading each frame
            const h = camera.heading
            const remaining = Cesium.Math.negativePiToPi(0 - h)

            // Stop when close enough to north
            if (Math.abs(remaining) < Cesium.Math.toRadians(0.5)) {
                // Remove tick handler
                viewer.clock.onTick.removeEventListener(orbitTick)

                // Snap exactly to north inside constrained mode
                camera.lookAtTransform(
                    transform,
                    new Cesium.HeadingPitchRange(0, currentPitch, currentRange)
                )

                // Unlock camera AFTER the orbit is complete
                camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
            }
        }

        // 8. Add tick handler
        viewer.clock.onTick.addEventListener(orbitTick)
    })
}
