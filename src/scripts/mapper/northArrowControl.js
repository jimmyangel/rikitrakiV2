import * as Cesium from 'cesium'

// Awaitable lookDown using your stable pattern
function lookDownAsync(viewer) {
    return new Promise(resolve => {
        const scene = viewer.scene
        const camera = viewer.camera

        const ray = new Cesium.Ray(camera.positionWC, camera.directionWC)
        const target = scene.globe.pick(ray, scene)
        if (!target) {
            resolve()
            return
        }

        const camCarto = Cesium.Cartographic.fromCartesian(camera.positionWC)

        camera.flyToBoundingSphere(
            new Cesium.BoundingSphere(target, 1),
            {
                offset: new Cesium.HeadingPitchRange(
                    0,
                    Cesium.Math.toRadians(-90),
                    camCarto.height
                ),
                duration: 0.8,
                complete: resolve,
                cancel: resolve
            }
        )
    })
}

// Normalize heading interpolation to shortest path
function shortestAngle(from, to) {
    const delta = Cesium.Math.negativePiToPi(to - from)
    return from + delta
}

// Tween HPR around a fixed target using lookAt (stay constrained the whole time)
function tweenLookAt(viewer, target, startHPR, endHPR, durationSeconds) {
    return new Promise(resolve => {
        const camera = viewer.camera
        const scene = viewer.scene
        const startTime = performance.now()

        // Fix heading so we tween shortest path
        const fixedEndHeading = shortestAngle(startHPR.heading, endHPR.heading)

        function step(now) {
            const t = Math.min((now - startTime) / (durationSeconds * 1000), 1.0)
            const eased = t * t * (3 - 2 * t) // smoothstep

            const heading = Cesium.Math.lerp(startHPR.heading, fixedEndHeading, eased)
            const pitch   = Cesium.Math.lerp(startHPR.pitch,   endHPR.pitch,   eased)
            const range   = Cesium.Math.lerp(startHPR.range,   endHPR.range,   eased)

            camera.lookAt(
                target,
                new Cesium.HeadingPitchRange(heading, pitch, range)
            )

            if (t < 1.0) {
                scene.requestRender()
                requestAnimationFrame(step)
            } else {
                resolve()
            }
        }

        requestAnimationFrame(step)
    })
}

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

    el.addEventListener('click', async e => {
        e.preventDefault()

        const camera = viewer.camera
        const scene = viewer.scene

        // 1. Find the ground point the camera is looking at
        const ray = new Cesium.Ray(camera.positionWC, camera.directionWC)
        const target = scene.globe.pick(ray, scene)
        if (!target) return

        // 2. Capture original HPR relative to that target
        const originalRange = Cesium.Cartesian3.distance(camera.positionWC, target)
        const originalPitch = camera.pitch

        // 3. Look straight down (stable)
        await lookDownAsync(viewer)

        // 4. Rotate to north while top-down (drift-free)
        await new Promise(resolve => {
            camera.flyTo({
                destination: camera.positionWC,
                orientation: {
                    heading: 0,
                    pitch: Cesium.Math.toRadians(-90),
                    roll: 0
                },
                duration: 0.4,
                complete: resolve,
                cancel: resolve
            })
        })

        // 5. Define final HPR: same pitch & range, heading = 0 (north)
        const finalHPR = new Cesium.HeadingPitchRange(
            0,
            originalPitch,
            originalRange
        )

        // 6. Compute current HPR around the same target as tween start
        const startHPR = new Cesium.HeadingPitchRange(
            camera.heading,
            camera.pitch,
            Cesium.Cartesian3.distance(camera.positionWC, target)
        )

        // 7. Tween entirely in lookAt space (stay constrained, no snapping, no 360°)
        await tweenLookAt(viewer, target, startHPR, finalHPR, 0.8)

        // 8. Unlock camera after animation is fully complete
        camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
    })
}
