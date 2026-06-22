import { BffClient, PatientOperator } from '@astuteimaging/astute-core'
import { loadToken } from '../lib/token.js'

export async function patientList(formatTable: boolean): Promise<void> {
  const token = await loadToken()
  if (!token) {
    console.error('Not logged in. Run: astute auth login')
    process.exit(1)
  }

  const client = new BffClient(token)
  const op = new PatientOperator(client)
  const patients = await op.list()

  if (formatTable) {
    console.log('patientId'.padEnd(12) + 'outsideId')
    console.log('-'.repeat(28))
    for (const p of patients) {
      console.log(String(p.patientId).padEnd(12) + (p.outsideId ?? ''))
    }
  } else {
    console.log(JSON.stringify(patients, null, 2))
  }
}
