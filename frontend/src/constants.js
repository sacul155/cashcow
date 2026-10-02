// The allowed values for fields with a fixed set of choices (the same ones the API accepts)
export const ATM_STATUSES = ['Operational', 'In-Transport', 'Maintenance', 'Offline']
export const PRIORITIES = ['Low', 'Medium', 'Critical']
export const SERVICE_STATUSES = ['Pending', 'In-Progress', 'Completed', 'Failed']

// Turn a list of plain values into the { value, label } options a form dropdown needs
export const toOptions = (values) => values.map((value) => ({ value, label: value }))