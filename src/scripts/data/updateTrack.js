export async function updateTrack(payload, { added = [], removed = [] } = {}) {
    console.log('==============================')
    console.log('updateTrack() START')
    console.log('==============================')

    const { trackId } = payload
    const token = localStorage.getItem('rikitraki-token')
    if (!token) throw new Error('Missing JWT token')

    console.log('Payload received:', payload)
    console.log('Added photos:', added)
    console.log('Removed photos:', removed)

    // -----------------------------------------------------
    // 1. UPLOAD NEW PHOTOS
    // -----------------------------------------------------
    const uploadPromises = added.map(async (p) => {
        const picIndex = p.picIndex
        const file = p.file

        console.log('--- UPLOAD ---')
        console.log('Upload request:', {
            picIndex,
            fileExists: !!file,
            fileType: file?.type,
            fileSize: file?.size
        })

        if (!file) {
            throw new Error(`Missing file for added photo at picIndex=${picIndex}`)
        }

        const url = `${constants.APIV2_BASE_URL}/tracks/${trackId}/picture/${picIndex}`

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'image/jpeg'
            },
            body: file
        })

        if (!res.ok) {
            const text = await res.text()
            console.error('Upload failed:', text)
            throw new Error(`Upload failed for picIndex=${picIndex}`)
        }

        console.log(`Upload complete for picIndex=${picIndex}`)
    })

    // -----------------------------------------------------
    // 2. DELETE REMOVED PHOTOS
    // -----------------------------------------------------
    const deletePromises = removed.map(async (p) => {
        console.log('--- DELETE ---')
        console.log('Delete request:', {
            picIndex: p.picIndex,
            picName: p.picName
        })

        const url = `${constants.APIV2_BASE_URL}/tracks/${trackId}/picture/${p.picIndex}`

        const res = await fetch(url, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        if (!res.ok) {
            const text = await res.text()
            console.error('Delete failed:', text)
            throw new Error(`Delete failed for picIndex=${p.picIndex}`)
        }

        console.log(`Delete complete for picIndex=${p.picIndex}`)
    })

    // Execute uploads + deletes in parallel
    try {
        await Promise.all([...uploadPromises, ...deletePromises])
    } catch (err) {
        console.error('Photo mutation failed in updateTrack()', err)
        console.log('==============================')
        console.log('updateTrack() COMPLETE (ERROR)')
        console.log('==============================')
        return { ok: false, error: err.message }
    }

    // -----------------------------------------------------
    // 3. SANITIZE METADATA (edit-mode rules)
    // -----------------------------------------------------
    let sanitizedPhotos = undefined

    if (payload.trackPhotos !== undefined) {
        sanitizedPhotos = payload.trackPhotos.map((p, i) => {
            const { file, ...rest } = p

            // ⭐ Ensure prefix exists for edit mode
            if (rest.picThumbDataUrl && !rest.picThumbDataUrl.startsWith('data:')) {
                rest.picThumbDataUrl = `data:image/jpeg;base64,${rest.picThumbDataUrl}`
            }

            console.log(`Sanitizing trackPhotos[${i}]`, {
                hasFile: !!file,
                hasThumbDataUrl: !!rest.picThumbDataUrl,
                startsWithData: rest.picThumbDataUrl?.startsWith('data:')
            })

            return rest
        })
    }

    const metadataPayload = {
        trackId,
        trackName: payload.trackName,
        trackDescription: payload.trackDescription,
        trackFav: payload.trackFav,
        trackLevel: payload.trackLevel,
        trackType: payload.trackType,
        trackRegionTags: payload.trackRegionTags,
        hasPhotos: sanitizedPhotos ? sanitizedPhotos.length > 0 : undefined,
        trackPhotos: sanitizedPhotos
    }

    // Strip undefined
    Object.keys(metadataPayload).forEach(k => {
        if (metadataPayload[k] === undefined) delete metadataPayload[k]
    })

    console.log('--- METADATA UPDATE ---')
    console.log('Sending metadata payload:')
    console.log(JSON.stringify(metadataPayload, null, 2))

    // -----------------------------------------------------
    // 4. SEND METADATA UPDATE
    // -----------------------------------------------------
    const url = `${constants.APIV2_BASE_URL}/tracks/${trackId}`

    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadataPayload)
    })

    if (!res.ok) {
        const text = await res.text()
        console.error('Metadata update failed:', text)
        console.log('==============================')
        console.log('updateTrack() COMPLETE (ERROR)')
        console.log('==============================')
        return { ok: false, error: text }
    }

    console.log('Metadata update complete.')

    console.log('==============================')
    console.log('updateTrack() COMPLETE')
    console.log('==============================')

    return { ok: true }
}
