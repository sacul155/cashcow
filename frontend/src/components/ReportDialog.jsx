import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'

import { apiFetch } from '../api.js'
import { useApi } from '../hooks/useApi.js'

// Lists the reports attached to one service call and lets a technician attach another.
// A report stores a link to the diagnostic file (we don't upload files).
export default function ReportDialog({ serviceCall, onClose, onNotice }) {
  const { data, loading, error, reload } = useApi('/reports')
  const [fileUrl, setFileUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // The API already limits this list to the technician's own reports; keep this call's
  const reports = (data ?? []).filter((report) => report.service_call_id === serviceCall.id)

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      await apiFetch('/reports', {
        method: 'POST',
        body: JSON.stringify({
          file_url: fileUrl,
          notes: notes.trim() || null,
          service_call_id: serviceCall.id,
        }),
      })
      setFileUrl('')
      setNotes('')
      reload()
      onNotice({ severity: 'success', message: 'Report attached' })
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Reports: {serviceCall.title}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
        {loading && !data && <CircularProgress size={24} />}
        {data && reports.length === 0 && (
          <Typography color="text.secondary">No reports attached yet.</Typography>
        )}
        <List dense>
          {reports.map((report) => (
            <ListItem key={report.id} disableGutters>
              <ListItemText
                primary={
                  <Link href={report.file_url} target="_blank" rel="noopener noreferrer">
                    {report.file_url}
                  </Link>
                }
                secondary={`${new Date(report.timestamp).toLocaleString()}${report.notes ? ` · ${report.notes}` : ''}`}
              />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" gutterBottom>
          Attach a report
        </Typography>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField
            label="Link to diagnostic file"
            type="url"
            value={fileUrl}
            onChange={(event) => setFileUrl(event.target.value)}
            placeholder="https://..."
            required
            size="small"
          />
          <TextField
            label="Notes (optional)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            multiline
            minRows={2}
            size="small"
          />
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Attaching...' : 'Attach report'}
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}