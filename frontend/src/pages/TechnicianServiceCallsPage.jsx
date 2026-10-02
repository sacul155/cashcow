import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Box, Button, Snackbar, Typography } from '@mui/material'
import { useCallback, useMemo, useState } from 'react'

import { apiFetch } from '../api.js'
import DataTable from '../components/DataTable.jsx'
import ReportDialog from '../components/ReportDialog.jsx'
import ServiceCallActions from '../components/ServiceCallActions.jsx'
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
]

export default function TechnicianServiceCallsPage() {
  const { data, loading, error, reload } = useApi('/service-calls')
  const [notice, setNotice] = useState(null)
  const [reportCall, setReportCall] = useState(null)

  const changeStatus = useCallback(
    async (call, status) => {
      try {
        await apiFetch(`/service-calls/${call.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        })
        setNotice({ severity: 'success', message: `"${call.title}" is now ${status}` })
        reload()
      } catch (err) {
        setNotice({ severity: 'error', message: err.message })
      }
    },
    [reload],
  )

  const columns = useMemo(
    () => [
      ...COLUMNS,
      {
        field: 'actions',
        headerName: 'Actions',
        width: 280,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <ServiceCallActions
            call={params.row}
            onChangeStatus={changeStatus}
            onOpenReports={setReportCall}
          />
        ),
      },
    ],
    [changeStatus],
  )

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">My service calls</Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={reload} disabled={loading}>
          Refresh
        </Button>
      </Box>
      <DataTable
        rows={data ?? []}
        columns={columns}
        loading={loading}
        error={error}
        searchLabel="Search my service calls"
        pageSize={5}
      />

      {reportCall && (
        <ReportDialog
          serviceCall={reportCall}
          onClose={() => setReportCall(null)}
          onNotice={setNotice}
        />
      )}
      <Snackbar
        open={notice !== null}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notice ? (
          <Alert severity={notice.severity} onClose={() => setNotice(null)} variant="filled">
            {notice.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  )
}