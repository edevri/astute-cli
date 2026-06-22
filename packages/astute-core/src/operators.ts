import { BffClient } from './client.js'
import type { Patient, Study } from './types.js'

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
