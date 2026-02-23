import { constants } from '../config.js'

export async function uploadTrack({
    trackLatLng,
    trackRegionTags,
    trackLevel,
    trackType,
    trackFav,
    trackGPX,
    trackGPXBlob,
    trackName,
    trackDescription,
    hasPhotos,
    trackPhotos,   // schema objects only
    photos         // actual File objects
}) {
    console.log('==============================')
    console.log('uploadTrack() STUB START')
    console.log('==============================')

    // Simulate real upload delay
    console.log('Simulating upload delay (3 seconds)...')
    await new Promise(r => setTimeout(r, 3000))

    // 1. JWT token
    const token = localStorage.getItem('rikitraki-token')
    console.log('JWT token:', token ? '(present)' : '(missing)')

    // ------------------------------------------------------------
    // STEP 1: Upload photos FIRST (safer, avoids broken tracks)
    // ------------------------------------------------------------
    console.log('--- STEP 1: Upload photos (stub) ---')

    if (hasPhotos) {
        for (let i = 0; i < photos.length; i++) {
            const file = photos[i]
            console.log(`Uploading photo ${i}: ${file.name}`)
            console.log(`POST ${constants.APIV2_BASE_URL}/tracks/temp/photo/${i}`)
            console.log('(No network call made — stub only)')
        }
    } else {
        console.log('No photos to upload.')
    }

	// ------------------------------------------------------------
	// STEP 2: Create track AFTER photos succeed
	// ------------------------------------------------------------
	console.log('--- STEP 2: Create track (stub) ---')

	// Log each thumbnail for inspection
	if (hasPhotos) {
		console.log('--- Thumbnails (picThumbDataUrl) ---')
		trackPhotos.forEach((p, i) => {
			console.log(`Thumbnail ${i}:`, p.picThumbDataUrl)
		})
	}

	const trackPayload = {
		trackLatLng,
		trackRegionTags,
		trackLevel,
		trackType,
		trackFav,
		trackGPX,
		trackGPXBlob,
		trackName,
		trackDescription,
		hasPhotos,
		trackPhotos
	}

	console.log('--- Track payload (schema‑aligned) ---')
	console.log(trackPayload)

	console.log(`POST ${constants.APIV2_BASE_URL}/track`)
	console.log('(No network call made — stub only)')

	const trackId = 'stub-track-id-123'
	console.log('Simulated trackId:', trackId)

	console.log('==============================')
	console.log('uploadTrack() STUB COMPLETE')
	console.log('==============================')

    return {
        ok: true,
        trackId
    }
}

