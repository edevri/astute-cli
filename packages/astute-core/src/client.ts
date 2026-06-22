export class BffClient {
  private baseUrl: string
  private token: string

  constructor(token: string, baseUrl?: string) {
    this.token = token
    this.baseUrl = baseUrl ?? process.env['ASTUTE_BFF_URL'] ?? 'http://localhost:8080'
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    })
    if (!res.ok) throw new Error(`bff-cli ${path} → ${res.status}`)
    return res.json() as Promise<T>
  }
}
