import CrudPage from '../components/CrudPage.jsx'
import { useAuth } from '../AuthContext.jsx'
import { ROLES } from '../roles.js'

const COLUMNS = [
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
  { field: 'region', headerName: 'Region', flex: 1, minWidth: 140 },
  { field: 'capacity', headerName: 'Capacity', type: 'number', width: 110 },
  { field: 'supervisor_id', headerName: 'Supervisor ID', type: 'number', width: 140 },
]

const getFields = () => [
  { name: 'name', label: 'Name', required: true },
  { name: 'region', label: 'Region', required: true },
  { name: 'capacity', label: 'Capacity', type: 'number', required: true, min: 1 },
  { name: 'supervisor_id', label: 'Supervisor ID', type: 'number', required: true },
]

const toPayload = (values) => ({
  name: values.name,
  region: values.region,
  capacity: Number(values.capacity),
  supervisor_id: Number(values.supervisor_id),
})

const describeRow = (row) => `branch ${row.name}`

export default function BranchesPage() {
  const { user } = useAuth()
  return (
    <CrudPage
      title="Branches"
      singular="branch"
      path="/branches"
      columns={COLUMNS}
      getFields={getFields}
      toPayload={toPayload}
      describeRow={describeRow}
      canManage={user.role === ROLES.ADMIN}
      searchLabel="Search branches"
    />
  )
}