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
            gps = [data.longitude, data.latitude]
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
export function interpolateTrackLatLng(coords, ts) {
    if (!coords.length) return null

    for (let i = 0; i < coords.length - 1; i++) {
        const a = coords[i]
        const b = coords[i + 1]

        if (!a.timestamp || !b.timestamp) continue

        if (ts >= a.timestamp && ts <= b.timestamp) {
            const ratio = (ts - a.timestamp) / (b.timestamp - a.timestamp)
            const lat = a.lat + ratio * (b.lat - a.lat)
            const lon = a.lon + ratio * (b.lon - a.lon)
            return [lon, lat]
        }
    }

    return null
}

// ------------------------------
// Assign interpolated GPS
// ------------------------------
export function assignLatLngToPhotos(state) {
    const { trackPhotos, photoMeta, trackCoordinates, timeOffset } = state

    if (!trackCoordinates.length) return
    if (!trackPhotos.length) return

    for (let i = 0; i < trackPhotos.length; i++) {
        const meta = photoMeta[i]
        const photo = trackPhotos[i]

        if (meta.hasExifGps) continue
        if (!meta.timestamp) continue

        const shifted = meta.timestamp + timeOffset * 3600 * 1000
        photo.picLatLng = interpolateTrackLatLng(trackCoordinates, shifted)
    }
}

// ------------------------------
// Pipeline: addPhotos
// ------------------------------
export async function addPhotos(files, state, helpers) {
    const MAX = 8
    const { trackPhotos, photoMeta, photos, trackCoordinates } = state
    const { extractExif, normalizeImage, createThumbnail } = helpers

    for (const file of files) {
        if (trackPhotos.length >= MAX) {
            Alpine.store('ui').error = `Maximum of ${MAX} photos allowed`
            break
        }

        // 1. Extract EXIF
        const { gps, timestamp } = await extractExif(file)

        // 2. Normalize image
        const normalized = await normalizeImage(file)

        // 3. Create thumbnail (data URL)
        const thumbDataUrl = await createThumbnail(normalized)

        // 4. Push schema photo (backend-ready)
        trackPhotos.push({
            picName: normalized.name,
            picThumb: '',
            picLatLng: gps || null,
            picCaption: '',
            picThumbDataUrl: thumbDataUrl   // raw data URL is fine for upload
        })

        // 5. Determine tagType
        let tagType
        if (gps) {
            tagType = 'exif'
        } else {
            // If no EXIF GPS, interpolation may assign lat/lon later
            tagType = 'none'
        }

        // 6. Push UI metadata (UI-ready)
        photoMeta.push({
            id: trackPhotos.length - 1,
            preview: thumbDataUrl,
            latLng: gps || null,
            timestamp,
            tagType
        })

        // 7. Keep normalized file for upload
        photos.push(normalized)
    }

    state.hasPhotos = trackPhotos.length > 0

    // 8. If track has coordinates, interpolate missing photo lat/lon
    if (trackCoordinates.length) {
        assignLatLngToPhotos(state)

        // After interpolation, update tagType for interpolated photos
        state.photoMeta.forEach((m, idx) => {
            const p = state.trackPhotos[idx]

            if (!m.latLng && p.picLatLng) {
                // This photo got lat/lon from interpolation
                m.latLng = p.picLatLng
                m.tagType = 'time'
            }
        })
    }
}

