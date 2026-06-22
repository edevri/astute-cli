import { createInterface } from 'node:readline'
import { saveToken, loadToken, decodePayload } from '../lib/token.js'

const ASTUTE_AUTH_URL = process.env.ASTUTE_AUTH_URL ?? 'http://localhost:8000'

async function promptLine(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

async function promptPassword(question: string): Promise<string> {
  process.stdout.write(question)
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('data', function handler(chunk: Buffer) {
      if (chunk[0] === 13 || chunk[0] === 10) {
        process.stdout.write('\n')
        process.stdin.setRawMode(false)
        process.stdin.pause()
        process.stdin.off('data', handler)
        resolve(Buffer.concat(chunks).toString('utf8'))
      } else if (chunk[0] === 3) {
        process.exit(1)
      } else {
        chunks.push(chunk)
      }
    })
  })
}

export async function authLogin(): Promise<void> {
  const userName = await promptLine('Username: ')
  const password = await promptPassword('Password: ')

  const validateRes = await fetch(`${ASTUTE_AUTH_URL}/auth/validate-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userName, password }),
  })

  if (!validateRes.ok) {
    console.error('Login failed: invalid credentials')
    process.exit(1)
  }

  const validateData = (await validateRes.json()) as Record<string, unknown>
  const authId = validateData['auth_id'] as string

  const tokenRes = await fetch(`${ASTUTE_AUTH_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth_id: authId }),
  })

  if (!tokenRes.ok) {
    console.error('Login failed: could not obtain token')
    process.exit(1)
  }

  const tokenData = (await tokenRes.json()) as Record<string, unknown>
  const token = tokenData['token'] as string

  await saveToken(token)

  const payload = decodePayload(token)
  const displayName =
    (payload['preferred_username'] as string | undefined) ??
    (payload['email'] as string | undefined) ??
    String(tokenData['user_id'] ?? 'unknown')

  console.log(`Logged in as ${displayName}`)
}

export async function authWhoami(): Promise<void> {
  const token = await loadToken()
  if (!token) {
    console.error('Not logged in. Run: astute auth login')
    process.exit(1)
  }
  const payload = decodePayload(token)
  console.log(
    JSON.stringify(
      {
        username: payload['preferred_username'] ?? null,
        email: payload['email'] ?? null,
        user_id: payload['user_id'] ?? null,
        permissions: payload['permissions'] ?? [],
      },
      null,
      2,
    ),
  )
}
