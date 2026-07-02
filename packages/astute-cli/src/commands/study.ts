import { BffClient, StudyOperator } from '@astuteimaging/astute-core'
import { loadToken } from '../lib/token.js'

export async function studyList(patientId: number | undefined, includePhi: boolean, formatTable: boolean): Promise<void> {
  const token = await loadToken()
  if (!token) {
    console.error('Not logged in. Run: astute auth login')
    process.exit(1)
  }

  const client = new BffClient(token)
  const op = new StudyOperator(client)
  const result = await op.list(patientId, { includePhi })

  if (formatTable) {
    const phiArr = Array.isArray(result.widgetOnly) ? result.widgetOnly : []
    const widths = includePhi
      ? [10, 12, 24, 10, 10, 8, 16, 12, 16]
      : [10, 12, 24, 10, 10, 8]
    const cols = includePhi
      ? ['studyId', 'patientId', 'scanDate', 'anatomy', 'prepost', 'status', 'patientName', 'dob', 'outsideId']
      : ['studyId', 'patientId', 'scanDate', 'anatomy', 'prepost', 'status']
    console.log(cols.map((c, i) => c.padEnd(widths[i])).join('  '))
    console.log('-'.repeat(widths.reduce((a, b) => a + b + 2, 0)))
    for (let i = 0; i < result.model.studies.length; i++) {
      const s = result.model.studies[i]
      const w = phiArr[i]
      const base = [
        String(s.studyId).padEnd(widths[0]),
        String(s.patientId).padEnd(widths[1]),
        (s.scanDate ?? '').padEnd(widths[2]),
        (s.anatomy ?? '').padEnd(widths[3]),
        (s.prepost ?? '').padEnd(widths[4]),
        (s.status ?? '').padEnd(widths[5]),
      ]
      const phi = includePhi && w
        ? [
            (w.patientName ?? '').padEnd(widths[6]),
            (w.dob ?? '').padEnd(widths[7]),
            (w.outsideId ?? '').padEnd(widths[8]),
          ]
        : []
      console.log([...base, ...phi].join('  '))
    }
  } else {
    console.log(JSON.stringify(result, null, 2))
  }
}
