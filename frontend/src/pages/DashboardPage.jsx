import RefreshIcon from '@mui/icons-material/Refresh'
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'

import StatCard from '../components/StatCard.jsx'
import StatusChip from '../components/StatusChip.jsx'
import { formatCurrency, formatPercent } from '../format.js'
import { useApi } from '../hooks/useApi.js'

export default function DashboardPage() {
  const { data, loading, error, reload } = useApi('/metrics/dashboard')

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Dashboard</Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={reload} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {loading && !data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      )}
      {data && <DashboardContent data={data} />}
    </Box>
  )
}

function DashboardContent({ data }) {
  const {
    summary,
    low_cash,
    technician_mismatches,
    completion_by_model,
    maintenance_alerts,
    technicians_by_supervisor,
  } = data

  const hasAlerts =
    low_cash.total > 0 || technician_mismatches.length > 0 || maintenance_alerts.length > 0

  return (
    <Grid container spacing={3}>
      {/* Headline numbers */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard label="Total ATMs" value={summary.total_atms} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard label="Open service calls" value={summary.open_service_calls} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          label="Critical open calls"
          value={summary.critical_open_service_calls}
          color={summary.critical_open_service_calls > 0 ? 'error.main' : undefined}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <StatCard
          label="Low-cash ATMs"
          value={low_cash.total}
          color={low_cash.total > 0 ? 'warning.main' : undefined}
        />
      </Grid>

      {/* Status badges */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              ATMs by status
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(summary.atms_by_status).map(([status, count]) => (
                <StatusChip key={status} status={status} count={count} />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Service calls by status
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(summary.service_calls_by_status).map(([status, count]) => (
                <StatusChip key={status} status={status} count={count} />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Alerts: only the ones that currently apply */}
      <Grid size={12}>
        <Typography variant="h6" gutterBottom>
          Alerts
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!hasAlerts && <Alert severity="success">No alerts right now.</Alert>}

          {technician_mismatches.length > 0 && (
            <Alert severity="error">
              <AlertTitle>
                {technician_mismatches.length} technician(s) assigned outside their branch
              </AlertTitle>
              <List dense disablePadding>
                {technician_mismatches.map((item) => (
                  <ListItem key={item.service_call_id} disableGutters>
                    <ListItemText
                      primary={`${item.technician_name} (${item.technician_branch_name}) is assigned to "${item.service_call_title}" at ATM ${item.atm_serial_number} (${item.atm_branch_name})`}
                    />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}

          {low_cash.total > 0 && (
            <Alert severity="warning">
              <AlertTitle>
                {low_cash.total} active ATM(s) below {formatCurrency(low_cash.threshold_amount)}
              </AlertTitle>
              <List dense disablePadding>
                {low_cash.atms.map((atm) => (
                  <ListItem key={atm.id} disableGutters>
                    <ListItemText
                      primary={`ATM ${atm.serial_number} at ${atm.branch_name}: ${formatCurrency(atm.cash_level)} (${atm.percent_full}% full)`}
                    />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}

          {maintenance_alerts.length > 0 && (
            <Alert severity="warning">
              <AlertTitle>{maintenance_alerts.length} branch(es) with many ATMs in maintenance</AlertTitle>
              <List dense disablePadding>
                {maintenance_alerts.map((branch) => (
                  <ListItem key={branch.branch_id} disableGutters>
                    <ListItemText
                      primary={`${branch.branch_name}: ${branch.maintenance_atms} of ${branch.total_atms} ATMs in maintenance (${branch.percent_in_maintenance}%)`}
                    />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}
        </Box>
      </Grid>

      {/* Reports */}
      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Completed vs failed service calls, by ATM model
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Model</TableCell>
                  <TableCell align="right">Completed</TableCell>
                  <TableCell align="right">Failed</TableCell>
                  <TableCell align="right">Completed %</TableCell>
                  <TableCell align="right">Failed %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {completion_by_model.map((row) => (
                  <TableRow key={row.model}>
                    <TableCell>{row.model}</TableCell>
                    <TableCell align="right">{row.completed}</TableCell>
                    <TableCell align="right">{row.failed}</TableCell>
                    <TableCell align="right">{formatPercent(row.completed_percent)}</TableCell>
                    <TableCell align="right">{formatPercent(row.failed_percent)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Technicians on active calls, by supervisor
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Supervisor</TableCell>
                  <TableCell align="right">Technicians</TableCell>
                  <TableCell align="right">Active calls</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {technicians_by_supervisor.map((row) => (
                  <TableRow key={row.supervisor_id}>
                    <TableCell>Supervisor {row.supervisor_id}</TableCell>
                    <TableCell align="right">{row.technicians}</TableCell>
                    <TableCell align="right">{row.active_calls}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}