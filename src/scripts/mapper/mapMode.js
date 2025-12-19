export function enter2DMode(viewer, Cesium) {
  const controller = viewer.scene.screenSpaceCameraController

  controller.enableTilt = false
  /* controller.enableLook = false
  controller.enableRotate = false */

  viewer.camera.setView({
    orientation: {
      heading: viewer.camera.heading,
      pitch: Cesium.Math.toRadians(-90),
      roll: 0
    }
  })
}

export function enter3DMode(viewer) {
  const controller = viewer.scene.screenSpaceCameraController

  controller.enableTilt = true
  /* controller.enableLook = true
  controller.enableRotate = true */
}

