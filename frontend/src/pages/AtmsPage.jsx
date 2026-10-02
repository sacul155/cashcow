import RefreshIcon from '@mui/icons-material/Refresh'
import { Box, Button, Typography } from '@mui/material'

import DataTable from '../components/DataTable.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { formatCurrency } from '../format.js'
import { useApi } from '../hooks/useApi.js'

const COLUMNS = [
  { field: 'serial_number', headerName: 'Serial', width: 110 },
  { field: 'model', headerName: 'Model', flex: 1, minWidth: 180 },
  { field: 'branch_name', headerName: 'Branch', flex: 1, minWidth: 130 },
  {
    field: 'status',
    headerName: 'Status',
    width: 150,
    renderCell: (params) => <StatusChip status={params.value} />,
  },
  {
    field: 'cash_level',
    headerName: 'Cash level',
    type: 'number',
    width: 130,
    // The API sends money as text, so convert to a number to sort numerically
    valueGetter: (value) => Number(value),
    valueFormatter: (value) => formatCurrency(value),
  },
]

export default function AtmsPage() {
  const { data, loading, error, reload } = useApi('/atms')

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">ATMs</Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={reload} disabled={loading}>
          Refresh
        </Button>
      </Box>
      <DataTable
        rows={data ?? []}
        columns={COLUMNS}
        loading={loading}
        error={error}
        searchLabel="Search ATMs"
      />
    </Box>
  )
}