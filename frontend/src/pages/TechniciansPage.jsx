import { useMemo } from 'react'

import { useAuth } from '../AuthContext.jsx'
import CrudPage from '../components/CrudPage.jsx'
import { useApi } from '../hooks/useApi.js'
import { ROLES } from '../roles.js'

const toPayload = (values) => ({ name: values.name, branch_id: Number(values.branch_id) })
const describeRow = (row) => `technician ${row.name}`

export default function TechniciansPage() {
  const { user } = useAuth()
  const { data: branches, loading: branchesLoading } = useApi('/branches')

  // The API returns branch_id only, so look the branch name up in the branches list
  const columns = useMemo(() => {
    const branchNames = Object.fromEntries((branches ?? []).map((branch) => [branch.id, branch.name]))
    return [
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
      {
        field: 'branch_id',
        headerName: 'Branch',
        flex: 1,
        minWidth: 160,
        valueGetter: (value) => branchNames[value] ?? '',
      },
    ]
  }, [branches])

  const getFields = () => [
    { name: 'name', label: 'Name', required: true },
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
      title="Technicians"
      singular="technician"
      path="/technicians"
      columns={columns}
      getFields={getFields}
      toPayload={toPayload}
      describeRow={describeRow}
      canManage={user.role === ROLES.ADMIN}
      ready={!branchesLoading}
      searchLabel="Search technicians"
    />
  )
}