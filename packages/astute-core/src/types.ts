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
