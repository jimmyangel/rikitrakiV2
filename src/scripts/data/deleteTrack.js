export async function deleteTrack(trackId) {

	console.log('deleteTrack() START')

    const token = localStorage.getItem('rikitraki-token')
    if (!token) throw new Error('Missing JWT token')

    const res = await fetch(`${constants.APIV2_BASE_URL}/tracks/${trackId}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`
        }
    })

    if (!res.ok) {
        return { ok: false }
    }

    return { ok: true }
}
