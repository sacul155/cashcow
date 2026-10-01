import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Chip, Container, Typography } from '@mui/material'

const API_URL = import.meta.env.VITE_API_URL

export default function App() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((response) => response.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Card>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              CashCow
            </Typography>
            <Typography sx={{ mb: 2 }}>Backend API status:</Typography>
            <Chip
              label={status}
              color={status === 'ok' ? 'success' : 'error'}
            />
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}