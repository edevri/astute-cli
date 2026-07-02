#!/usr/bin/env node
import type { AstuteConfig } from '@astuteimaging/astute-core'
import { DeviceFamily } from '@astuteimaging/astute-core'
import { authLogin, authWhoami } from './commands/auth.js'
import { authToken } from './commands/auth-token.js'
import { patientList } from './commands/patient.js'
import { studyList } from './commands/study.js'
import { measurementGet } from './commands/measurement.js'
import { ifuCheck } from './commands/ifu.js'
import { growthGet } from './commands/growth.js'
import { surveillanceGet } from './commands/surveillance.js'

const config: AstuteConfig = { version: '0.1.0' }

const args = process.argv.slice(2)

if (args.includes('--version')) {
  console.log(config.version)
  process.exit(0)
}

function isTableFormat(flags: string[]): boolean {
  return (
    (flags.includes('--format') && flags[flags.indexOf('--format') + 1] === 'table') ||
    (flags.includes('--output') && flags[flags.indexOf('--output') + 1] === 'table')
  )
}

const [cmd, sub, ...rest] = args

if (cmd === 'auth') {
  if (sub === 'login') {
    await authLogin()
  } else if (sub === 'whoami') {
    await authWhoami()
  } else if (sub === 'token') {
    await authToken()
  } else {
    console.error('Usage: astute auth <login|whoami|token>')
    process.exit(1)
  }
} else if (cmd === 'patient') {
  if (sub === 'list') {
    await patientList(rest.includes('--include-phi'), isTableFormat(rest))
  } else {
    console.error('Usage: astute patient list [--include-phi] [--format table]')
    process.exit(1)
  }
} else if (cmd === 'study') {
  if (sub === 'list') {
    const patientIdStr = rest.find((a) => !a.startsWith('-'))
    if (!patientIdStr) {
      console.error('Usage: astute study list <patientId> [--format table]')
      process.exit(1)
    }
    await studyList(Number(patientIdStr), isTableFormat(rest))
  } else {
    console.error('Usage: astute study list <patientId> [--format table]')
    process.exit(1)
  }
} else if (cmd === 'measurement') {
  if (sub === 'get') {
    const studyIdStr = rest.find((a) => !a.startsWith('-'))
    if (!studyIdStr) {
      console.error('Usage: astute measurement get <studyId> [--field <name>] [--format table]')
      process.exit(1)
    }
    const fieldIdx = rest.indexOf('--field')
    const fieldFilter = fieldIdx !== -1 ? (rest[fieldIdx + 1] ?? null) : null
    await measurementGet(Number(studyIdStr), fieldFilter, isTableFormat(rest))
  } else {
    console.error('Usage: astute measurement get <studyId> [--field <name>] [--format table]')
    process.exit(1)
  }
} else if (cmd === 'growth') {
  const patientIdStr = sub
  if (!patientIdStr || patientIdStr.startsWith('-')) {
    console.error('Usage: astute growth <patientId> [--json]')
    process.exit(1)
  }
  await growthGet(Number(patientIdStr), rest.includes('--json'))
} else if (cmd === 'ifu') {
  if (sub === 'families') {
    console.log(Object.values(DeviceFamily).join('\n'))
  } else if (sub === 'check') {
    const studyIdStr = rest.find((a) => !a.startsWith('-'))
    if (!studyIdStr) {
      console.error('Usage: astute ifu check <studyId> [--family <name>] [--format table]')
      process.exit(1)
    }
    const familyIdx = rest.indexOf('--family')
    const familyArg = familyIdx !== -1 ? (rest[familyIdx + 1] ?? null) : null
    const familyFilter = familyArg
      ? (Object.values(DeviceFamily).find((f) => f === familyArg) ?? null)
      : null
    if (familyArg && !familyFilter) {
      console.error(`Unknown family "${familyArg}". Valid: ${Object.values(DeviceFamily).join(', ')}`)
      process.exit(1)
    }
    await ifuCheck(Number(studyIdStr), familyFilter, isTableFormat(rest))
  } else {
    console.error('Usage: astute ifu <families|check>')
    process.exit(1)
  }
} else if (cmd === 'surveillance') {
  const patientIdStr = sub
  if (!patientIdStr || patientIdStr.startsWith('-')) {
    console.error('Usage: astute surveillance <patientId> [--include-phi] [--json]')
    process.exit(1)
  }
  await surveillanceGet(Number(patientIdStr), rest.includes('--include-phi'), rest.includes('--json'))
} else {
  console.error('Usage: astute <auth|patient|study|measurement|growth|ifu|surveillance> [--version]\n       astute auth <login|whoami|token>')
  process.exit(1)
}
