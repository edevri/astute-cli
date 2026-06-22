export type Patient = { patientId: number; outsideId: string | null; sex: string | null }
export type Study = {
  studyId: number
  scanDate: string
  anatomy: string
  prepost: string
  status: string
  protocol: string | null
}
