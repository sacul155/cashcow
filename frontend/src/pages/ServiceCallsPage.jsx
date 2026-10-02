import RefreshIcon from '@mui/icons-material/Refresh'
import { Box, Button, Typography } from '@mui/material'

import DataTable from '../components/DataTable.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { useApi } from '../hooks/useApi.js'

const COLUMNS = [
  { field: 'title', headerName: 'Title', flex: 1.5, minWidth: 220 },
  {
    field: 'priority',
    headerName: 'Priority',
    width: 120,
    renderCell: (params) => <StatusChip status={params.value} />,
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 140,
    renderCell: (params) => <StatusChip status={params.value} />,
  },
  { field: 'atm_serial_number', headerName: 'ATM', width: 100 },
  { field: 'atm_model', headerName: 'ATM model', flex: 1, minWidth: 170 },
  { field: 'branch_name', headerName: 'Branch', flex: 1, minWidth: 120 },
  {
    field: 'technician_name',
    headerName: 'Technician',
    flex: 1,
    minWidth: 140,
    valueGetter: (value) => value ?? 'Unassigned',
  },
]

export default function ServiceCallsPage() {
  const { data, loading, error, reload } = useApi('/service-calls')

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Service calls</Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={reload} disabled={loading}>
          Refresh
        </Button>
      </Box>
      <DataTable
        rows={data ?? []}
        columns={COLUMNS}
        loading={loading}
        error={error}
        searchLabel="Search service calls"
        pageSize={5}
      />
    </Box>
  )
}