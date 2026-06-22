#!/usr/bin/env node
import type { AstuteConfig } from '@astuteimaging/astute-core'
import { authLogin, authWhoami } from './commands/auth.js'
import { patientList } from './commands/patient.js'
import { studyList } from './commands/study.js'
import { measurementGet } from './commands/measurement.js'

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
  } else {
    console.error('Usage: astute auth <login|whoami>')
    process.exit(1)
  }
} else if (cmd === 'patient') {
  if (sub === 'list') {
    await patientList(isTableFormat(rest))
  } else {
    console.error('Usage: astute patient list [--format table]')
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
} else {
  console.error('Usage: astute <auth|patient|study|measurement> [--version]')
  process.exit(1)
}
