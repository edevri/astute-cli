import { loadToken } from '../lib/token.js'

export async function authToken(): Promise<void> {
  const token = await loadToken()
  if (!token) {
    console.error('No token stored. Run: astute auth login')
    process.exit(1)
  }
  console.log(token)
}
