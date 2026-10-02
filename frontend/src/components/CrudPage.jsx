import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Box, Button, IconButton, Snackbar, Tooltip, Typography } from '@mui/material'
import { useMemo, useState } from 'react'

import { apiFetch } from '../api.js'
import { useApi } from '../hooks/useApi.js'
import ConfirmDialog from './ConfirmDialog.jsx'
import DataTable from './DataTable.jsx'
import FormDialog from './FormDialog.jsx'

// A complete "list of records" page: a searchable grid and, when canManage is true,
// Add / Edit / Delete with a form and a confirmation. The API enforces who may really
// change things; canManage only decides whether the buttons are shown.
//
//   title, singular   "Branches", "branch"
//   path              the API address, e.g. '/branches'
//   columns           the grid columns (an Actions column is added when canManage)
//   getFields(row)    the form fields; row is the record being edited, or null when adding
//   toFormValues(row) turn a record into starting form values (default: use the record as is)
//   toPayload(values, row) turn the form values into the JSON the API expects;
//                     row is the record being edited, or null when adding
//   describeRow(row)  a short name for a record, used in messages
//   ready             set false while data the form needs (dropdown options) is still loading
export default function CrudPage({
  title,
  singular,
  path,
  columns,
  getFields,
  toFormValues = (row) => row,
  toPayload,
  describeRow,
  canManage,
  ready = true,
  searchLabel,
  pageSize,
}) {
  const { data, loading, error, reload } = useApi(path)
  const [dialog, setDialog] = useState(null) // { mode: 'create' | 'edit' | 'delete', row }
  const [notice, setNotice] = useState(null)

  const allColumns = useMemo(() => {
    if (!canManage) return columns
    return [
      ...columns,
      {
        field: 'actions',
        headerName: '',
        width: 110,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                aria-label={`Edit ${describeRow(params.row)}`}
                onClick={() => setDialog({ mode: 'edit', row: params.row })}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                aria-label={`Delete ${describeRow(params.row)}`}
                onClick={() => setDialog({ mode: 'delete', row: params.row })}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ]
  }, [canManage, columns, describeRow])

  async function save(values) {
    const body = JSON.stringify(toPayload(values, dialog.mode === 'edit' ? dialog.row : null))
    if (dialog.mode === 'create') {
      await apiFetch(path, { method: 'POST', body })
      setNotice({ severity: 'success', message: `Added ${singular}` })
    } else {
      await apiFetch(`${path}/${dialog.row.id}`, { method: 'PATCH', body })
      setNotice({ severity: 'success', message: `Saved ${describeRow(dialog.row)}` })
    }
    setDialog(null)
    reload()
  }

  async function remove() {
    await apiFetch(`${path}/${dialog.row.id}`, { method: 'DELETE' })
    setNotice({ severity: 'success', message: `Deleted ${describeRow(dialog.row)}` })
    setDialog(null)
    reload()
  }

  const editing = dialog?.mode === 'edit' ? dialog.row : null

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">{title}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {canManage && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              disabled={!ready}
              onClick={() => setDialog({ mode: 'create', row: null })}
            >
              Add {singular}
            </Button>
          )}
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={reload} disabled={loading}>
            Refresh
          </Button>
        </Box>
      </Box>

      <DataTable
        rows={data ?? []}
        columns={allColumns}
        loading={loading}
        error={error}
        searchLabel={searchLabel}
        pageSize={pageSize}
      />

      {(dialog?.mode === 'create' || dialog?.mode === 'edit') && (
        <FormDialog
          title={dialog.mode === 'create' ? `Add ${singular}` : `Edit ${describeRow(dialog.row)}`}
          fields={getFields(editing)}
          initialValues={editing ? toFormValues(editing) : {}}
          onSubmit={save}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.mode === 'delete' && (
        <ConfirmDialog
          title={`Delete ${singular}?`}
          message={`This permanently deletes ${describeRow(dialog.row)}.`}
          onConfirm={remove}
          onClose={() => setDialog(null)}
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