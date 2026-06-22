import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const TOKEN_DIR = join(homedir(), '.astute')
const TOKEN_PATH = join(TOKEN_DIR, 'token')

export async function saveToken(token: string): Promise<void> {
  await mkdir(TOKEN_DIR, { recursive: true })
  await writeFile(TOKEN_PATH, token, 'utf8')
}

export async function loadToken(): Promise<string | null> {
  try {
    return (await readFile(TOKEN_PATH, 'utf8')).trim()
  } catch {
    return null
  }
}

export function decodePayload(token: string): Record<string, unknown> {
  const parts = token.split('.')
  if (parts.length !== 3) return {}
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}
