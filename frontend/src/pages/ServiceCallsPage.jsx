import { useAuth } from '../AuthContext.jsx'
import CrudPage from '../components/CrudPage.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { PRIORITIES, SERVICE_STATUSES, toOptions } from '../constants.js'
import { useApi } from '../hooks/useApi.js'
import { ROLES } from '../roles.js'
import TechnicianServiceCallsPage from './TechnicianServiceCallsPage.jsx'

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

const describeRow = (row) => `service call "${row.title}"`

// '' means "no technician" in the form; the API wants null for that
const technicianIdFor = (values) => (values.technician_id === '' ? null : Number(values.technician_id))

// row is the call being edited, or null when adding one
function toPayload(values, row) {
  const shared = {
    title: values.title,
    priority: values.priority,
    technician_id: technicianIdFor(values),
  }
  if (row === null) return { ...shared, atm_id: Number(values.atm_id) }
  return { ...shared, status: values.status }
}

export default function ServiceCallsPage() {
  const { user } = useAuth()
  // A Field Technician gets their own page, with status buttons and reports
  if (user.role === ROLES.TECHNICIAN) return <TechnicianServiceCallsPage />
  return <ServiceCallsManager canManage={user.role === ROLES.ADMIN} />
}

function ServiceCallsManager({ canManage }) {
  // Only the Admin's Add/Edit form needs these dropdown lists
  const { data: atms, loading: atmsLoading } = useApi('/atms', { skip: !canManage })
  const { data: technicians, loading: techniciansLoading } = useApi('/technicians', {
    skip: !canManage,
  })

  const getFields = (row) => [
    { name: 'title', label: 'Title', required: true },
    {
      name: 'priority',
      label: 'Priority',
      type: 'select',
      required: true,
      defaultValue: 'Medium',
      options: toOptions(PRIORITIES),
    },
    // The ATM is chosen when a call is created; it cannot be changed afterwards
    {
      name: 'atm_id',
      label: 'ATM',
      type: 'select',
      required: true,
      disabled: row !== null,
      options: (atms ?? []).map((atm) => ({
        value: atm.id,
        label: `${atm.serial_number} · ${atm.branch_name}`,
      })),
    },
    // A new call always starts as Pending, so status is only editable later
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: toOptions(SERVICE_STATUSES),
      visible: () => row !== null,
    },
    {
      name: 'technician_id',
      label: 'Technician',
      type: 'select',
      options: [
        { value: '', label: 'Unassigned' },
        ...(technicians ?? []).map((t) => ({ value: t.id, label: t.name })),
      ],
    },
  ]

  return (
    <CrudPage
      title="Service calls"
      singular="service call"
      path="/service-calls"
      columns={COLUMNS}
      getFields={getFields}
      toFormValues={(row) => ({ ...row, technician_id: row.technician_id ?? '' })}
      toPayload={toPayload}
      describeRow={describeRow}
      canManage={canManage}
      ready={!atmsLoading && !techniciansLoading}
      searchLabel="Search service calls"
      pageSize={5}
    />
  )
}