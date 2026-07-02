import { BffClient } from './client.js'
import type { Patient, Study, Measurement, GrowthSeries, IFUCheckRow, IFUResult, SurveillanceResult } from './types.js'
import { DeviceFamily } from './types.js'

export class PatientOperator {
  constructor(private client: BffClient) {}
  async list(): Promise<Patient[]> {
    return this.client.get<Patient[]>('/patient')
  }
}

export class StudyOperator {
  constructor(private client: BffClient) {}
  async listForPatient(patientId: number): Promise<Study[]> {
    return this.client.get<Study[]>(`/patient/${patientId}/studies`)
  }
}

export class MeasurementOperator {
  constructor(private client: BffClient) {}
  async getForStudy(studyId: number): Promise<Measurement[]> {
    return this.client.get<Measurement[]>(`/study/${studyId}/measurements`)
  }
}

export class GrowthSeriesOperator {
  constructor(private client: BffClient) {}
  async get(patientId: number, opts?: { includePhi?: boolean }): Promise<GrowthSeries> {
    const params = opts?.includePhi ? { includePhi: 'true' } : undefined
    return this.client.get<GrowthSeries>(`/patient/${patientId}/growth`, params)
  }
}

export class SurveillanceOperator {
  constructor(private client: BffClient) {}
  async get(patientId: number, opts?: { includePhi?: boolean }): Promise<SurveillanceResult> {
    const params = opts?.includePhi ? { includePhi: 'true' } : undefined
    return this.client.get<SurveillanceResult>(`/patient/${patientId}/surveillance`, params)
  }
}

type IFUSpec = {
  param: string
  field: string | string[]
  check: (v: number) => boolean
  bound: string
  citation: string
}

const IFU_SPECS: Record<DeviceFamily, IFUSpec[]> = {
  [DeviceFamily.EndurantIIs]: [
    {
      param: 'neck diameter',
      field: ['pnd1', 'pnd2'],
      check: (v) => v >= 19 && v <= 32,
      bound: '19–32 mm',
      citation: 'Endurant IIs IFU — neck diameter 19–32 mm',
    },
    {
      param: 'neck length',
      field: 'pnsz',
      check: (v) => v >= 10,
      bound: '≥10 mm',
      citation: 'Endurant IIs IFU — neck length ≥10 mm',
    },
    {
      param: 'neck angle (infrarenal)',
      field: 'pn-aaa angle',
      check: (v) => v <= 60,
      bound: '≤60°',
      citation: 'Endurant IIs IFU — neck angulation ≤60°',
    },
    {
      param: 'iliac diameter',
      field: ['rcia-av', 'lcia-av'],
      check: (v) => v >= 8 && v <= 25,
      bound: '8–25 mm',
      citation: 'Endurant IIs IFU — iliac diameter 8–25 mm',
    },
  ],
  [DeviceFamily.GoreExcluderStd]: [
    {
      param: 'neck diameter',
      field: ['pnd1', 'pnd2'],
      check: (v) => v >= 19 && v <= 32,
      bound: '19–32 mm',
      citation: 'Gore Excluder IFU — neck diameter 19–32 mm',
    },
    {
      param: 'neck length',
      field: 'pnsz',
      check: (v) => v >= 15,
      bound: '≥15 mm',
      citation: 'Gore Excluder IFU — neck length ≥15 mm',
    },
    {
      param: 'neck angle (infrarenal)',
      field: 'pn-aaa angle',
      check: (v) => v <= 60,
      bound: '≤60°',
      citation: 'Gore Excluder IFU — neck angulation ≤60°',
    },
    {
      param: 'iliac diameter',
      field: ['rcia-av', 'lcia-av'],
      check: (v) => v >= 8 && v <= 25,
      bound: '8–25 mm',
      citation: 'Gore Excluder IFU — iliac diameter 8–25 mm',
    },
  ],
  [DeviceFamily.GoreExcluderConformable]: [
    {
      param: 'neck diameter',
      field: ['pnd1', 'pnd2'],
      check: (v) => v >= 16 && v <= 32,
      bound: '16–32 mm',
      citation: 'Gore Excluder Conformable IFU — neck diameter 16–32 mm',
    },
    {
      param: 'neck length',
      field: 'pnsz',
      check: (v) => v >= 10,
      bound: '≥10 mm',
      citation: 'Gore Excluder Conformable IFU — neck length ≥10 mm',
    },
    {
      param: 'neck angle (infrarenal)',
      field: 'pn-aaa angle',
      check: (v) => v <= 90,
      bound: '≤90°',
      citation: 'Gore Excluder Conformable IFU — neck angulation ≤90°',
    },
    {
      param: 'iliac diameter',
      field: ['rcia-av', 'lcia-av'],
      check: (v) => v >= 8 && v <= 25,
      bound: '8–25 mm',
      citation: 'Gore Excluder Conformable IFU — iliac diameter 8–25 mm',
    },
  ],
  [DeviceFamily.CookZenithFlex]: [
    {
      param: 'neck diameter',
      field: ['pnd1', 'pnd2'],
      check: (v) => v >= 20 && v <= 26,
      bound: '20–26 mm',
      citation: 'Cook Zenith Flex IFU — neck diameter 20–26 mm',
    },
    {
      param: 'neck length',
      field: 'pnsz',
      check: (v) => v >= 15,
      bound: '≥15 mm',
      citation: 'Cook Zenith Flex IFU — neck length ≥15 mm',
    },
    {
      param: 'neck angle (infrarenal)',
      field: 'pn-aaa angle',
      check: (v) => v <= 60,
      bound: '≤60°',
      citation: 'Cook Zenith Flex IFU — neck angulation (infrarenal) ≤60°',
    },
    {
      param: 'neck angle (suprarenal)',
      field: 'suprarenal-pn angle',
      check: (v) => v <= 45,
      bound: '≤45°',
      citation: 'Cook Zenith Flex IFU — neck angulation (suprarenal) ≤45°',
    },
    {
      param: 'iliac diameter',
      field: ['rcia-av', 'lcia-av'],
      check: (v) => v >= 7.5 && v <= 20,
      bound: '7.5–20 mm',
      citation: 'Cook Zenith Flex IFU — iliac diameter 7.5–20 mm',
    },
  ],
}

export class IFUCheck {
  static run(measurements: Measurement[], family: DeviceFamily): IFUResult {
    const byField = new Map(measurements.map((m) => [m.field.toLowerCase(), m.value]))
    const rows: IFUCheckRow[] = []

    for (const spec of IFU_SPECS[family]) {
      const fields = Array.isArray(spec.field) ? spec.field : [spec.field]
      // For multi-field params, each field gets its own row; any failing field fails the param
      for (const f of fields) {
        const patientValue = byField.get(f.toLowerCase()) ?? null
        const pass = patientValue !== null ? spec.check(patientValue) : false
        rows.push({ family, param: spec.param, patientValue, ifuBound: spec.bound, pass, citation: spec.citation })
      }
    }

    return { family, rows }
  }
}
