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
    const cols = ['studyId', 'scanDate', 'anatomy', 'prepost', 'status']
    console.log(cols.map((c) => c.padEnd(14)).join(''))
    console.log('-'.repeat(cols.length * 14))
    for (const s of studies) {
      console.log(
        [
          String(s.studyId).padEnd(14),
          (s.scanDate ?? '').padEnd(14),
          (s.anatomy ?? '').padEnd(14),
          (s.prepost ?? '').padEnd(14),
          (s.status ?? '').padEnd(14),
        ].join(''),
      )
    }
  } else {
    console.log(JSON.stringify(studies, null, 2))
  }
}
