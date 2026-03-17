// src/utils/photoUtils.js
import { parse } from 'exifr'

// ------------------------------
// Thumbnail
// ------------------------------
export async function createThumbnail(file) {
    const W = 300
    const H = 225

    return new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = e => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = W
                canvas.height = H

                const ctx = canvas.getContext('2d')

                const scale = Math.max(W / img.width, H / img.height)
                const scaledWidth = img.width * scale
                const scaledHeight = img.height * scale

                const offsetX = (W - scaledWidth) / 2
                const offsetY = (H - scaledHeight) / 2

                ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

                resolve(canvas.toDataURL('image/jpeg', 0.85))
            }
            img.src = e.target.result
        }
        reader.readAsDataURL(file)
    })
}

// ------------------------------
// Normalize image
// ------------------------------
export async function normalizeImage(file) {
    const maxBytes = 1_000_000
    const maxWidth = 2048

    if (file.size <= maxBytes) return file

    const img = await new Promise((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = reject
        i.src = URL.createObjectURL(file)
    })

    let targetWidth = img.naturalWidth
    let targetHeight = img.naturalHeight

    if (img.naturalWidth > maxWidth) {
        targetWidth = maxWidth
        targetHeight = img.naturalHeight * (maxWidth / img.naturalWidth)
    }

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

    let quality = 0.92
    let blob = await new Promise(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', quality)
    )

    while (blob.size > maxBytes && quality > 0.5) {
        quality -= 0.05
        blob = await new Promise(resolve =>
            canvas.toBlob(resolve, 'image/jpeg', quality)
        )
    }

    return new File([blob], file.name, { type: 'image/jpeg' })
}

// ------------------------------
// EXIF
// ------------------------------
export async function extractExif(file) {
    try {
        const data = await parse(file, {
            gps: true,
            tiff: true,
            exif: true
        })

        let gps = null
        let timestamp = null

        if (data && data.latitude != null && data.longitude != null) {
            // ✔ EXIF now returns [lat, lon]
            gps = [data.latitude, data.longitude]
        }

        if (data && data.DateTimeOriginal instanceof Date) {
            timestamp = data.DateTimeOriginal.getTime()
        }

        return { gps, timestamp }

    } catch (err) {
        console.warn('EXIF parsing failed:', err)
        return { gps: null, timestamp: null }
    }
}

// ------------------------------
// Track interpolation
// ------------------------------
export function interpolateTrackLatLng(trackCoordinates, trackTimes, ts) {

    if (!trackCoordinates.length || !trackTimes.length) return null

    for (let i = 0; i < trackCoordinates.length - 1; i++) {
        const t0 = trackTimes[i]
        const t1 = trackTimes[i + 1]

        if (t0 == null || t1 == null) continue

        if (ts >= t0 && ts <= t1) {
            const ratio = (ts - t0) / (t1 - t0)

            // trackCoordinates are [lon, lat] from GPX
            const [lon0, lat0] = trackCoordinates[i]
            const [lon1, lat1] = trackCoordinates[i + 1]

            const lon = lon0 + ratio * (lon1 - lon0)
            const lat = lat0 + ratio * (lat1 - lat0)

            // ✔ Return [lat, lon] to match EXIF + legacy
            return [lat, lon]
        }
    }
    return null
}

// ------------------------------
// Assign interpolated GPS
// ------------------------------
export function assignLatLngToPhotos(state) {
    if (!state.trackCoordinates || state.trackCoordinates.length < 2) return
    if (!state.trackTimes || state.trackTimes.length < 2) return
    if (!state.photoMeta || state.photoMeta.length === 0) return

    const { trackPhotos, photoMeta, trackCoordinates, trackTimes, timeOffset } = state

    for (let i = 0; i < trackPhotos.length; i++) {
        const meta = photoMeta[i]
        const photo = trackPhotos[i]

        // DB photos: preserve everything
        if (meta.tagType === 'previous') {
            meta.latLng = photo.picLatLng
            continue
        }

        // EXIF GPS always wins (already [lat, lon])
        if (meta.hasExifGps) {
            meta.tagType = 'exif'
            continue
        }

        if (!meta.timestamp) {
            meta.tagType = 'none'
            meta.latLng = null
            photo.picLatLng = null
            continue
        }

        const shifted = meta.timestamp + timeOffset * 3600 * 1000
        const interpolated = interpolateTrackLatLng(trackCoordinates, trackTimes, shifted)

        if (interpolated) {
            // matched
            meta.latLng = interpolated          // [lat, lon]
            photo.picLatLng = interpolated      // [lat, lon]
            meta.tagType = 'time'
        } else {
            // out of range
            meta.latLng = null
            photo.picLatLng = null
            meta.tagType = 'none'
        }
    }
}

// ------------------------------
// Pipeline: addPhotos
// ------------------------------
const MAX_NUM_IMAGES = 8

export async function addPhotos(files, state, helpers) {
    const { extractExif, normalizeImage, createThumbnail } = helpers

    // --- JPEG VALIDATION HELPERS ---
    async function isRealJpeg(file) {
        // Quick MIME check
        if (file.type !== 'image/jpeg') return false

        // Magic-byte check (FF D8 FF)
        const header = new Uint8Array(await file.slice(0, 3).arrayBuffer())
        return header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF
    }

    // --- MAX LIMIT CHECK ---
    if (state.trackPhotos.length + files.length > MAX_NUM_IMAGES) {
        state.$store?.ui && (state.$store.ui.error = `You can upload up to ${MAX_NUM_IMAGES} photos.`)
        return
    }

    for (const file of files) {

        // --- JPEG ENFORCEMENT ---
        const ok = await isRealJpeg(file)
        if (!ok) {
            console.warn('Rejected non-JPEG file:', file)
            state.$store?.ui && (state.$store.ui.error = `Only JPEG images are allowed.`)
            continue
        }

        // --- EXIF EXTRACTION ---
        const exif = await extractExif(file)
        const normalized = await normalizeImage(file)

        // exif.gps is now [lat, lon]
        const gps = Array.isArray(exif?.gps) ? exif.gps : null

        // timestamp normalization
        let timestamp = null
        if (typeof exif?.timestamp === 'number') {
            timestamp = exif.timestamp
        }

        const thumbDataUrl = await createThumbnail(normalized)

        // picIndex
        let picIndex
        if (typeof state.nextPicIndex === 'number') {
            picIndex = state.nextPicIndex++
        } else {
            picIndex = state.trackPhotos.length
        }

        // Derive picName + picCaption from file.name
        const originalName = file.name || ''
        const baseName = originalName.replace(/\.[^/.]+$/, '')

        const picName = originalName
        const picCaption = baseName

        // TrackPhotos entry (UI list)
        state.trackPhotos.push({
            picIndex,
            picName,
            picCaption,
            picLatLng: gps ? [gps[0], gps[1]] : null,
            picThumb: null,
            picThumbDataUrl: thumbDataUrl.replace(/^data:image\/jpeg;base64,/, '')
        })

        // PhotoMeta entry
        state.photoMeta.push({
            id: picIndex,
            caption: picCaption,
            latLng: gps ? [gps[0], gps[1]] : null,
            timestamp,
            preview: thumbDataUrl,
            tagType: gps ? 'exif' : 'none',
            hasExifGps: !!gps
        })

        // Raw JPEG bytes for upload
        state.photos.push(normalized)
    }

    state.hasPhotos = state.trackPhotos.length > 0

    // Only interpolate when trackCoordinates exist
    if (state.trackCoordinates && state.trackCoordinates.length > 1) {
        assignLatLngToPhotos(state)

        // After interpolation, sync latLng into trackPhotos
        state.photoMeta.forEach((m, idx) => {
            const p = state.trackPhotos[idx]

            if (!m.hasExifGps && !m.latLng && p.picLatLng) {
                m.latLng = p.picLatLng
                m.tagType = 'time'
            }
        })
    }
}

