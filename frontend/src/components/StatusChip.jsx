import { Chip } from '@mui/material'

// Which MUI color each status or priority gets
const COLORS = {
  Operational: 'success',
  'In-Transport': 'info',
  Maintenance: 'warning',
  Offline: 'error',
  Pending: 'default',
  'In-Progress': 'info',
  Completed: 'success',
  Failed: 'error',
  Low: 'default',
  Medium: 'warning',
  Critical: 'error',
}

export default function StatusChip({ status, count }) {
  const label = count === undefined ? status : `${status}: ${count}`
  return <Chip label={label} color={COLORS[status] ?? 'default'} size="small" />
}