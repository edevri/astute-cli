import { BffClient, SurveillanceOperator } from '@astuteimaging/astute-core'
import { loadToken } from '../lib/token.js'

export async function surveillanceGet(
  patientId: number,
  includePhi: boolean,
  jsonOutput: boolean,
): Promise<void> {
  const token = await loadToken()
  if (!token) {
    console.error('Not logged in. Run: astute auth login')
    process.exit(1)
  }

  const client = new BffClient(token)
  const op = new SurveillanceOperator(client)
  const result = await op.get(patientId)

  if (jsonOutput) {
    if (includePhi) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(JSON.stringify(result.model, null, 2))
    }
    return
  }

  const { studies } = result.model

  if (studies.length === 0) {
    console.log('No post-EVAR studies found for this patient.')
    return
  }

  const colWidths = [10, 12, 12, 16, 20]
  const header = ['STUDY ID', 'DATE', 'SAC (mm)', 'ENDOLEAK (mm³)', 'FLAGS']
  console.log(header.map((h, i) => h.padEnd(colWidths[i])).join('  '))
  console.log('-'.repeat(colWidths.reduce((a, b) => a + b + 2, 0)))

  for (const s of studies) {
    const flags: string[] = []
    if (s.derived.sacExpansionConcerning) flags.push('SAC-EXPANSION')
    if (s.derived.endoleakPresent) flags.push('ENDOLEAK')

    console.log(
      [
        String(s.studyId).padEnd(colWidths[0]),
        (s.scanDate ?? '—').padEnd(colWidths[1]),
        (s.sacDiameterMm !== null ? s.sacDiameterMm.toFixed(1) : '—').padEnd(colWidths[2]),
        (s.endoleakVolumeMm3 !== null ? s.endoleakVolumeMm3.toFixed(1) : '—').padEnd(colWidths[3]),
        (flags.join(', ') || '—').padEnd(colWidths[4]),
      ].join('  '),
    )
  }

  if (includePhi) {
    // --include-phi: dev-only, not for production use
    const phi = result.widgetOnly
    console.log('\n--- PHI (dev-only) ---')
    console.log(`Patient: ${phi.patientName ?? '—'}`)
    console.log(`DOB:     ${phi.dob ?? '—'}`)
    console.log(`MRN:     ${phi.mrn ?? '—'}`)
  }
}
