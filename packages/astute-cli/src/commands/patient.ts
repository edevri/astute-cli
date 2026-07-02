import { BffClient, PatientOperator } from '@astuteimaging/astute-core'
import { loadToken } from '../lib/token.js'

export async function patientList(includePhi: boolean, formatTable: boolean): Promise<void> {
  const token = await loadToken()
  if (!token) {
    console.error('Not logged in. Run: astute auth login')
    process.exit(1)
  }

  const client = new BffClient(token)
  const op = new PatientOperator(client)
  const result = await op.list({ includePhi })

  if (formatTable) {
    const header = includePhi
      ? 'patientId'.padEnd(12) + 'sex'.padEnd(8) + 'outsideId'.padEnd(16) + 'firstName'.padEnd(16) + 'lastName'.padEnd(16) + 'dob'
      : 'patientId'.padEnd(12) + 'sex'
    console.log(header)
    console.log('-'.repeat(includePhi ? 72 : 20))
    const phi = Array.isArray(result.widgetOnly) ? result.widgetOnly : []
    for (let i = 0; i < result.model.patients.length; i++) {
      const p = result.model.patients[i]
      const w = phi[i]
      const base = String(p.patientId).padEnd(12) + (p.sex ?? '').padEnd(8)
      const phiCols = includePhi && w
        ? (w.outsideId ?? '').padEnd(16) + (w.firstName ?? '').padEnd(16) + (w.lastName ?? '').padEnd(16) + (w.dob ?? '')
        : ''
      console.log(base + phiCols)
    }
  } else {
    console.log(JSON.stringify(result, null, 2))
  }
}
