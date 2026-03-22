export function wireMapHelp() {
	const el = document.getElementById('mapHelp')

	el.addEventListener('click', e => {
		e.preventDefault()
		console.log('trigger help modal')
	})
}