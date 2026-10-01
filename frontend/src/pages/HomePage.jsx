import { Box, Button, Card, CardContent, Container, Typography } from '@mui/material'

import { useAuth } from '../AuthContext.jsx'

export default function HomePage() {
  const { user, logout } = useAuth()

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Card>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              Welcome, {user.full_name}
            </Typography>
            <Typography sx={{ mb: 2 }}>You are logged in as {user.email}.</Typography>
            <Button variant="outlined" onClick={logout}>
              Log out
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}