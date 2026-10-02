import { useMemo } from 'react'

import { useAuth } from '../AuthContext.jsx'
import CrudPage from '../components/CrudPage.jsx'
import { useApi } from '../hooks/useApi.js'
import { ROLES } from '../roles.js'

const ROLE_OPTIONS = Object.values(ROLES).map((role) => ({ value: role, label: role }))
const describeRow = (row) => `user ${row.email}`

// Only a Field Technician login is linked to a technician; other roles are not
const technicianIdFor = (values) =>
  values.role === ROLES.TECHNICIAN ? Number(values.technician_id) : null

// row is the user being edited, or null when adding one
function toPayload(values, row) {
  if (row === null) {
    return {
      email: values.email,
      full_name: values.full_name,
      password: values.password,
      role: values.role,
      technician_id: technicianIdFor(values),
    }
  }
  return {
    full_name: values.full_name,
    role: values.role,
    technician_id: technicianIdFor(values),
    // Leave the password out entirely unless a new one was typed
    ...(values.password ? { password: values.password } : {}),
  }
}

export default function UsersPage() {
  const { user } = useAuth()
  const { data: technicians, loading: techniciansLoading } = useApi('/technicians')

  const columns = useMemo(() => {
    const technicianNames = Object.fromEntries((technicians ?? []).map((t) => [t.id, t.name]))
    return [
      { field: 'email', headerName: 'Email', flex: 1.2, minWidth: 220 },
      { field: 'full_name', headerName: 'Name', flex: 1, minWidth: 160 },
      { field: 'role', headerName: 'Role', width: 170 },
      {
        field: 'technician_id',
        headerName: 'Linked technician',
        flex: 1,
        minWidth: 160,
        valueGetter: (value) => (value === null ? '' : (technicianNames[value] ?? '')),
      },
    ]
  }, [technicians])

  const getFields = (row) => [
    { name: 'email', label: 'Email', type: 'email', required: true, disabled: row !== null },
    { name: 'full_name', label: 'Full name', required: true },
    { name: 'role', label: 'Role', type: 'select', required: true, options: ROLE_OPTIONS },
    {
      name: 'technician_id',
      label: 'Technician this login belongs to',
      type: 'select',
      required: true,
      options: (technicians ?? []).map((t) => ({ value: t.id, label: t.name })),
      visible: (values) => values.role === ROLES.TECHNICIAN,
    },
    {
      name: 'password',
      label: row === null ? 'Password' : 'New password',
      type: 'password',
      required: row === null,
      helperText: row === null ? 'At least 8 characters' : 'Leave blank to keep the current password',
    },
  ]

  return (
    <CrudPage
      title="Users"
      singular="user"
      path="/users"
      columns={columns}
      getFields={getFields}
      toPayload={toPayload}
      describeRow={describeRow}
      canManage={user.role === ROLES.ADMIN}
      ready={!techniciansLoading}
      searchLabel="Search users"
    />
  )
}