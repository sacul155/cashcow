import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material'
import { useState } from 'react'

// A dropdown that has an "Unassigned"-style option whose value is '' must still show that
// option's text, instead of looking empty
const hasEmptyOption = (field) =>
  field.type === 'select' && field.options.some((option) => option.value === '')

function FormField({ field, value, onChange }) {
  const showsEmptyOption = hasEmptyOption(field)
  return (
    <TextField
      label={field.label}
      value={value}
      onChange={(event) => onChange(field.name, event.target.value)}
      select={field.type === 'select'}
      type={field.type === 'select' ? undefined : (field.type ?? 'text')}
      required={field.required}
      disabled={field.disabled}
      helperText={field.helperText}
      size="small"
      fullWidth
      slotProps={{
        htmlInput: { min: field.min, max: field.max, step: field.step, pattern: field.pattern },
        select: { displayEmpty: showsEmptyOption },
        inputLabel: { shrink: showsEmptyOption || undefined },
      }}
    >
      {field.type === 'select' &&
        field.options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
    </TextField>
  )
}

// A pop-up form built from a list of field descriptions. Each field looks like:
//   { name, label, type, required, disabled, helperText, options, visible, defaultValue,
//     min, max, step, pattern }
// type is 'text' (default), 'number', 'email', 'password' or 'select' (give it options).
// visible(values) can hide a field depending on what is typed in the others.
// onSubmit(values) should throw an Error if the save fails; its message is shown in the form.
export default function FormDialog({ title, fields, initialValues, submitLabel = 'Save', onSubmit, onClose }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      fields.map((field) => [field.name, initialValues[field.name] ?? field.defaultValue ?? '']),
    ),
  )
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const setValue = (name, value) => setValues((current) => ({ ...current, [name]: value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await onSubmit(values) // on success the page closes this dialog
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { component: 'form', onSubmit: handleSubmit } }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        {fields
          .filter((field) => !field.visible || field.visible(values))
          .map((field) => (
            <FormField key={field.name} field={field} value={values[field.name]} onChange={setValue} />
          ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}