import { BffClient, StudyOperator } from '@astuteimaging/astute-core'
import { loadToken } from '../lib/token.js'

export async function studyList(patientId: number, formatTable: boolean): Promise<void> {
  const token = await loadToken()
  if (!token) {
    console.error('Not logged in. Run: astute auth login')
    process.exit(1)
  }

  const client = new BffClient(token)
  const op = new StudyOperator(client)
  const studies = await op.listForPatient(patientId)

  if (formatTable) {
    const widths = [10, 32, 10, 10, 8]
    const cols = ['studyId', 'scanDate', 'anatomy', 'prepost', 'status']
    console.log(cols.map((c, i) => c.padEnd(widths[i])).join('  '))
    console.log('-'.repeat(widths.reduce((a, b) => a + b + 2, 0)))
    for (const s of studies) {
      console.log(
        [
          String(s.studyId).padEnd(widths[0]),
          (s.scanDate ?? '').padEnd(widths[1]),
          (s.anatomy ?? '').padEnd(widths[2]),
          (s.prepost ?? '').padEnd(widths[3]),
          (s.status ?? '').padEnd(widths[4]),
        ].join('  '),
      )
    }
  } else {
    console.log(JSON.stringify(studies, null, 2))
  }
}
