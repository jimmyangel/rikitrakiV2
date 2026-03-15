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
    trackPhotos,
    photos
}) {
    console.log('uploadTrack() START')

    const token = localStorage.getItem('rikitraki-token')
    if (!token) throw new Error('Missing JWT token')

    // ------------------------------------------------------------
    // SANITIZE GPX BLOB
    // ------------------------------------------------------------
    let gpxBlobString = trackGPXBlob
    if (trackGPXBlob instanceof Blob) {
        gpxBlobString = await trackGPXBlob.text()
    }

    // ------------------------------------------------------------
    // SANITIZE PHOTOS (only optional fields normalized)
    // ------------------------------------------------------------
    const sanitizedPhotos = trackPhotos.map((p, idx) => {
        const {
            picIndex,          // strip (not in schema)
            picCaption,        // optional → normalize
            picThumbDataUrl,   // required → normalize shape only
            ...rest
        } = p

        // Optional caption → normalize to empty string
        const safeCaption =
            typeof picCaption === 'string'
                ? picCaption
                : ""

        // Required thumbnail → ensure full data URL shape
        // (this was the bug we fixed before)
        if (typeof picThumbDataUrl !== 'string' || picThumbDataUrl.length === 0) {
            throw new Error(`Missing thumbnail data for photo index ${idx}`)
        }

        const fullDataUrl = picThumbDataUrl.startsWith('data:')
            ? picThumbDataUrl
            : `data:image/jpeg;base64,${picThumbDataUrl}`

        return {
            ...rest,
            picCaption: safeCaption,
            picThumbDataUrl: fullDataUrl
        }
    })

    // ------------------------------------------------------------
    // BUILD PAYLOAD
    // ------------------------------------------------------------
    const trackPayload = {
        trackLatLng,
        trackRegionTags,
        trackLevel,
        trackType,
        trackFav,
        trackGPX,
        trackGPXBlob: gpxBlobString,
        trackName,
        trackDescription,
        hasPhotos,
        trackPhotos: sanitizedPhotos
    }

    const createRes = await fetch(`${constants.APIV2_BASE_URL}/tracks`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(trackPayload)
    })

    if (!createRes.ok) {
        const text = await createRes.text().catch(() => '')
        throw new Error(`Track creation failed: ${text}`)
    }

    const { trackId } = await createRes.json()
    if (!trackId) throw new Error('Track created but no trackId returned')

    console.log('Track created with ID:', trackId)

    // ------------------------------------------------------------
    // STEP 2 — UPLOAD PHOTOS AS RAW JPEG BYTES
    // ------------------------------------------------------------
    if (hasPhotos && photos.length > 0) {
        console.log(`Uploading ${photos.length} photos as RAW JPEG bytes...`)

        const uploadPromises = photos.map(async (file, i) => {
            console.log(`Preparing photo ${i} for raw upload...`, {
                name: file.name,
                type: file.type,
                size: file.size
            })

            // Convert File → raw bytes
            const arrayBuffer = await file.arrayBuffer()
            const uint8 = new Uint8Array(arrayBuffer)

            const res = await fetch(
                `${constants.APIV2_BASE_URL}/tracks/${trackId}/picture/${i}`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'image/jpeg'
                    },
                    body: uint8
                }
            )

            if (!res.ok) {
                const text = await res.text().catch(() => '')
                throw new Error(`Photo upload failed at index ${i}: ${text}`)
            }

            console.log(`Photo ${i} uploaded successfully`)
        })

        await Promise.all(uploadPromises)
        console.log('All photos uploaded successfully')
    }

    console.log('uploadTrack() COMPLETE')

    return {
        ok: true,
        trackId
    }
}
