export type Patient = { patientId: number; outsideId: string | null; sex: string | null }
export type Study = {
  studyId: number
  scanDate: string
  anatomy: string
  prepost: string
  status: string
  protocol: string | null
}
export type Measurement = { field: string; value: number; unit: string }

export type GrowthPoint = {
  studyId: number
  scanDate: string
  maxSacDiameterMm: number
  observed: true
}

export type GrowthDerived = {
  repairThresholdCrossed: boolean
  acceleratedGrowth: boolean
  latestDiameterMm: number
  provenance: string
}

export type GrowthSeries = {
  points: GrowthPoint[]
  derived: GrowthDerived
}

export enum DeviceFamily {
  EndurantIIs = 'EndurantIIs',
  GoreExcluderStd = 'GoreExcluderStd',
  GoreExcluderConformable = 'GoreExcluderConformable',
  CookZenithFlex = 'CookZenithFlex',
}

export type IFUCheckRow = {
  family: DeviceFamily
  param: string
  patientValue: number | null
  ifuBound: string
  pass: boolean
  citation: string
}

export type IFUResult = {
  family: DeviceFamily
  rows: IFUCheckRow[]
}

export type TwoChannelResult<M, W> = {
  readonly model: M
  readonly widgetOnly: W
}

export type SurveillanceStudyModel = {
  studyId: number
  scanDate: string
  sacDiameterMm: number | null
  endoleakVolumeMm3: number | null
  derived: {
    sacExpansionConcerning: boolean
    endoleakPresent: boolean
    provenance: string
  }
}

export type SurveillancePHI = {
  patientName: string | null
  dob: string | null
  mrn: string | null
}

export type SurveillanceResult = TwoChannelResult<
  { studies: SurveillanceStudyModel[] },
  SurveillancePHI
>
