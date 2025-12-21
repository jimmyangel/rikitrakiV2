import * as Cesium from 'cesium'

export function wireZoomControl(viewer) {
    const zoomIn = document.querySelector('.map-control-zoom-in')
    const zoomOut = document.querySelector('.map-control-zoom-out')

    if (!viewer) return

    const smoothMove = (distance, duration = 0.25) => {
        const start = performance.now()

        const step = now => {
            const t = (now - start) / (duration * 1000)
            if (t >= 1) return

            // ease-out curve
            const eased = 1 - Math.pow(1 - t, 3)

            viewer.camera.moveForward(distance * eased * 0.1)

            requestAnimationFrame(step)
        }

        requestAnimationFrame(step)
    }

    const getStep = () => {
        const height = viewer.camera.positionCartographic.height
        return height * 0.2
    }

    zoomIn?.addEventListener('click', e => {
        e.preventDefault()
        smoothMove(getStep())
    })

    zoomOut?.addEventListener('click', e => {
        e.preventDefault()
        smoothMove(-getStep())
    })
}


