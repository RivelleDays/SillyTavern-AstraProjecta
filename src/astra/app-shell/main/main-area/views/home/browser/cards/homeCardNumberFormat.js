export function formatCompactCount(value) {
	const numeric = Number(value)
	if (!Number.isFinite(numeric)) return '—'
	if (numeric <= 0) return '0'

	const absValue = Math.abs(numeric)
	const sign = numeric < 0 ? '-' : ''

	const formatSuffix = (scaledValue, suffix, decimals) => {
		const factor = 10 ** decimals
		const rounded = Math.round(scaledValue * factor) / factor
		const text = decimals > 0 ? rounded.toFixed(decimals).replace(/\.0+$/, '') : String(Math.round(rounded))
		return `${sign}${text}${suffix}`
	}

	if (absValue < 1_000) {
		return `${sign}${Math.round(absValue)}`
	}

	if (absValue < 1_000_000) {
		const scaled = absValue / 1_000
		return formatSuffix(scaled, 'k', scaled < 100 ? 1 : 0)
	}

	if (absValue < 1_000_000_000) {
		const scaled = absValue / 1_000_000
		return formatSuffix(scaled, 'm', scaled < 100 ? 1 : 0)
	}

	const scaled = absValue / 1_000_000_000
	return formatSuffix(scaled, 'b', scaled < 100 ? 1 : 0)
}
