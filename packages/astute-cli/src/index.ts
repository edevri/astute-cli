#!/usr/bin/env node
import type { AstuteConfig } from '@astuteimaging/astute-core'
import { authLogin, authWhoami } from './commands/auth.js'
import { patientList } from './commands/patient.js'
import { studyList } from './commands/study.js'

const config: AstuteConfig = { version: '0.1.0' }

const args = process.argv.slice(2)

if (args.includes('--version')) {
  console.log(config.version)
  process.exit(0)
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
    const formatTable = rest.includes('--format') && rest[rest.indexOf('--format') + 1] === 'table'
    await patientList(formatTable)
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
    const formatTable =
      rest.includes('--format') && rest[rest.indexOf('--format') + 1] === 'table'
    await studyList(Number(patientIdStr), formatTable)
  } else {
    console.error('Usage: astute study list <patientId> [--format table]')
    process.exit(1)
  }
} else {
  console.error('Usage: astute <auth|patient|study> [--version]')
  process.exit(1)
}
