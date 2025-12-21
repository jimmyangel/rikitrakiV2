import * as Cesium from 'cesium'

export function lookDown(viewer) {
	const scene = viewer.scene
	const camera = viewer.camera

	const ray = new Cesium.Ray(camera.positionWC, camera.directionWC)
	const target = scene.globe.pick(ray, scene)
	if (!target) return

	const camCarto = Cesium.Cartographic.fromCartesian(camera.positionWC)

	camera.flyToBoundingSphere(
		new Cesium.BoundingSphere(target, 1),
		{
			offset: new Cesium.HeadingPitchRange(
				0,                           // snap north
				Cesium.Math.toRadians(-90),  // tilt down
				camCarto.height              // keep same height
			),
			duration: 1.5
		}
	)
}
