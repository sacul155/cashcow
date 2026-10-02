// The three roles, spelled exactly as the API sends them
export const ROLES = {
  ADMIN: 'Operations Admin',
  TECHNICIAN: 'Field Technician',
  AUDITOR: 'Auditor',
}

// Where each role lands after logging in
export function homePathFor(role) {
  return role === ROLES.TECHNICIAN ? '/service-calls' : '/'
}

// The navigation links each role sees. This only controls what is SHOWN: the API enforces
// the real rules, so hiding a link here never replaces a check on the server.
export function navItemsFor(role) {
  if (role === ROLES.TECHNICIAN) {
    return [
      { label: 'My service calls', to: '/service-calls' },
      { label: 'My ATMs', to: '/atms' },
    ]
  }
  const items = [
    { label: 'Dashboard', to: '/' },
    { label: 'ATMs', to: '/atms' },
    { label: 'Service Calls', to: '/service-calls' },
    { label: 'Branches', to: '/branches' },
    { label: 'Technicians', to: '/technicians' },
  ]
  if (role === ROLES.ADMIN) items.push({ label: 'Users', to: '/users' })
  return items
}