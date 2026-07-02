import { BffClient, MeasurementOperator } from '@astuteimaging/astute-core'
import { loadToken } from '../lib/token.js'

export async function measurementGet(
  studyId: number,
  fieldFilter: string | null,
  includePhi: boolean,
  formatTable: boolean,
): Promise<void> {
  if (includePhi) {
    console.log('This command has no PHI fields.')
    return
  }

  const token = await loadToken()
  if (!token) {
    console.error('Not logged in. Run: astute auth login')
    process.exit(1)
  }

  const client = new BffClient(token)
  const op = new MeasurementOperator(client)
  const result = await op.getForStudy(studyId)
  let measurements = result.model.measurements

  if (fieldFilter) {
    measurements = measurements.filter(
      (m) => m.field.toLowerCase() === fieldFilter.toLowerCase(),
    )
  }

  if (formatTable) {
    const widths = [36, 12, 8]
    const cols = ['field', 'value', 'unit']
    console.log(cols.map((c, i) => c.padEnd(widths[i])).join('  '))
    console.log('-'.repeat(widths.reduce((a, b) => a + b + 2, 0)))
    for (const m of measurements) {
      console.log(
        [
          (m.field ?? '').padEnd(widths[0]),
          String(m.value ?? '').padEnd(widths[1]),
          (m.unit ?? '').padEnd(widths[2]),
        ].join('  '),
      )
    }
  } else {
    console.log(JSON.stringify(measurements, null, 2))
  }
}
