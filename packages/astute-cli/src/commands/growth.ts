import { BffClient, GrowthSeriesOperator } from '@astuteimaging/astute-core'
import type { GrowthPoint } from '@astuteimaging/astute-core'
import { loadToken } from '../lib/token.js'

export async function growthGet(patientId: number, includePhi: boolean, jsonOutput: boolean): Promise<void> {
  const token = await loadToken()
  if (!token) {
    console.error('Not logged in. Run: astute auth login')
    process.exit(1)
  }

  const client = new BffClient(token)
  const op = new GrowthSeriesOperator(client)
  const series = await op.get(patientId, { includePhi })

  if (jsonOutput) {
    console.log(JSON.stringify(series.model, null, 2))
    return
  }

  const { points, derived } = series.model

  const colWidths = [12, 16, 10, 10]
  const header = ['DATE', 'DIAMETER (mm)', 'DELTA', 'FLAGS']
  console.log(header.map((h, i) => h.padEnd(colWidths[i])).join('  '))
  console.log('-'.repeat(colWidths.reduce((a, b) => a + b + 2, 0)))

  points.forEach((p: GrowthPoint, i: number) => {
    const prev = points[i - 1]
    const delta = prev != null ? (p.maxSacDiameterMm - prev.maxSacDiameterMm) : null
    const deltaStr = delta === null ? '—' : (delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1))

    const flags: string[] = []
    if (i === points.length - 1 && derived.repairThresholdCrossed) flags.push('THRESHOLD')
    if (prev != null) {
      const deltaMm = p.maxSacDiameterMm - prev.maxSacDiameterMm
      if (deltaMm > 0) {
        const days = (new Date(p.scanDate).getTime() - new Date(prev.scanDate).getTime()) / 86400000
        if ((days / 30.44 <= 6 && deltaMm > 5) || (days / 365.25 <= 1 && deltaMm > 10)) {
          flags.push('ACCEL')
        }
      }
    }

    console.log(
      [
        p.scanDate.padEnd(colWidths[0]),
        String(p.maxSacDiameterMm.toFixed(1)).padEnd(colWidths[1]),
        deltaStr.padEnd(colWidths[2]),
        flags.join(' ').padEnd(colWidths[3]),
      ].join('  '),
    )
  })

  console.log(`\nProvenance: ${derived.provenance}`)
  if (includePhi && series.widgetOnly.patientName) {
    console.log(`Patient: ${series.widgetOnly.patientName}`)
  }
}
