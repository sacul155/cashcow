import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Container, TextField, Typography } from '@mui/material'
import { Navigate, useLocation } from 'react-router'

import { useAuth } from '../AuthContext.jsx'

export default function LoginPage() {
  const { user, login } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const destination = location.state?.from?.pathname ?? '/'

  // Already logged in (including right after a successful login): leave this page
  if (user) return <Navigate to={destination} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              CashCow
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Sign in to continue
            </Typography>
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                autoFocus
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <Button type="submit" variant="contained" size="large" disabled={submitting}>
                {submitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}