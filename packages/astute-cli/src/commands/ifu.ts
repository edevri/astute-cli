import { BffClient, MeasurementOperator, IFUCheck, DeviceFamily } from '@astuteimaging/astute-core'
import type { IFUCheckRow } from '@astuteimaging/astute-core'
import { loadToken } from '../lib/token.js'

const ALL_FAMILIES = [
  DeviceFamily.EndurantIIs,
  DeviceFamily.GoreExcluderStd,
  DeviceFamily.GoreExcluderConformable,
  DeviceFamily.CookZenithFlex,
]

const FAMILY_DISPLAY: Record<DeviceFamily, string> = {
  [DeviceFamily.EndurantIIs]: 'Endurant IIs',
  [DeviceFamily.GoreExcluderStd]: 'Gore Excluder (standard)',
  [DeviceFamily.GoreExcluderConformable]: 'Gore Excluder Conformable',
  [DeviceFamily.CookZenithFlex]: 'Cook Zenith Flex',
}

export async function ifuCheck(
  studyId: number,
  familyFilter: DeviceFamily | null,
  formatTable: boolean,
): Promise<void> {
  const token = await loadToken()
  if (!token) {
    console.error('Not logged in. Run: astute auth login')
    process.exit(1)
  }

  const client = new BffClient(token)
  const measurements = await new MeasurementOperator(client).getForStudy(studyId)

  const families = familyFilter ? [familyFilter] : ALL_FAMILIES
  const rows: IFUCheckRow[] = families.flatMap((f) => IFUCheck.run(measurements, f).rows)

  if (formatTable) {
    const w = [26, 26, 8, 10, 6]
    const headers = ['family', 'param', 'value', 'bound', 'result']
    console.log(headers.map((h, i) => h.padEnd(w[i])).join('  '))
    console.log('-'.repeat(w.reduce((a, b) => a + b + 2, 0)))
    for (const r of rows) {
      const result = r.pass ? 'PASS' : 'FAIL'
      console.log(
        [
          FAMILY_DISPLAY[r.family].padEnd(w[0]),
          r.param.padEnd(w[1]),
          (r.patientValue !== null ? String(r.patientValue) : '—').padEnd(w[2]),
          r.ifuBound.padEnd(w[3]),
          result.padEnd(w[4]),
        ].join('  '),
      )
    }
  } else {
    console.log(JSON.stringify(rows, null, 2))
  }
}
