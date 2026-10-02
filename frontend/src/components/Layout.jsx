import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material'
import { NavLink, Outlet } from 'react-router'

import { useAuth } from '../AuthContext.jsx'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/' },
  { label: 'ATMs', to: '/atms' },
  { label: 'Service Calls', to: '/service-calls' },
]

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ mr: 4 }}>
            CashCow
          </Typography>
          <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.to}
                color="inherit"
                component={NavLink}
                to={item.to}
                end
                sx={{ '&.active': { bgcolor: 'rgba(255, 255, 255, 0.18)' } }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user.full_name}
          </Typography>
          <Button color="inherit" onClick={logout}>
            Log out
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  )
}