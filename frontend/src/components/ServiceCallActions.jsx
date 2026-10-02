import { Box, Button } from '@mui/material'

// The next steps a Field Technician may take. The API enforces this too (409 otherwise).
const NEXT_STEPS = {
  Pending: [{ label: 'Start', status: 'In-Progress' }],
  'In-Progress': [
    { label: 'Complete', status: 'Completed' },
    { label: 'Fail', status: 'Failed', color: 'error' },
  ],
}

export default function ServiceCallActions({ call, onChangeStatus, onOpenReports }) {
  const steps = NEXT_STEPS[call.status] ?? []

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
      {steps.map((step) => (
        <Button
          key={step.status}
          size="small"
          variant="contained"
          color={step.color ?? 'primary'}
          onClick={() => onChangeStatus(call, step.status)}
        >
          {step.label}
        </Button>
      ))}
      <Button size="small" variant="outlined" onClick={() => onOpenReports(call)}>
        Reports
      </Button>
    </Box>
  )
}