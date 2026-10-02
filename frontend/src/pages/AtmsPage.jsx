import { useAuth } from '../AuthContext.jsx'
import CrudPage from '../components/CrudPage.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { ATM_STATUSES, toOptions } from '../constants.js'
import { formatCurrency } from '../format.js'
import { useApi } from '../hooks/useApi.js'
import { ROLES } from '../roles.js'

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

const describeRow = (row) => `ATM ${row.serial_number}`

// row is the ATM being edited, or null when adding one
function toPayload(values, row) {
  const changeable = {
    model: values.model,
    status: values.status,
    cash_level: values.cash_level,
    branch_id: Number(values.branch_id),
  }
  // A serial number is chosen when the ATM is created and never changes
  return row === null ? { serial_number: values.serial_number, ...changeable } : changeable
}

export default function AtmsPage() {
  const { user } = useAuth()
  const isTechnician = user.role === ROLES.TECHNICIAN
  // Only the Admin's Add/Edit form needs the list of branches
  const { data: branches, loading: branchesLoading } = useApi('/branches', {
    skip: user.role !== ROLES.ADMIN,
  })

  const getFields = (row) => [
    {
      name: 'serial_number',
      label: 'Serial number',
      required: true,
      disabled: row !== null,
      pattern: '[0-9]{5}',
      helperText: 'Exactly 5 digits',
    },
    { name: 'model', label: 'Model', required: true },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'Operational',
      options: toOptions(ATM_STATUSES),
    },
    {
      name: 'cash_level',
      label: 'Cash level ($)',
      type: 'number',
      required: true,
      defaultValue: '0',
      min: 0,
      max: 10000,
      step: 0.01,
      helperText: 'Between $0 and $10,000 (a full reserve)',
    },
    {
      name: 'branch_id',
      label: 'Branch',
      type: 'select',
      required: true,
      options: (branches ?? []).map((branch) => ({ value: branch.id, label: branch.name })),
    },
  ]

  return (
    <CrudPage
      title={isTechnician ? 'My ATMs' : 'ATMs'}
      singular="ATM"
      path="/atms"
      columns={COLUMNS}
      getFields={getFields}
      toPayload={toPayload}
      describeRow={describeRow}
      canManage={user.role === ROLES.ADMIN}
      ready={!branchesLoading}
      searchLabel={isTechnician ? 'Search my ATMs' : 'Search ATMs'}
    />
  )
}