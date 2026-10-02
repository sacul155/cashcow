import SearchIcon from '@mui/icons-material/Search'
import { Alert, Box, Card, InputAdornment, TextField } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import { useState } from 'react'

// A table with live search, column sorting and pagination.
// Sorting and pagination are built into DataGrid; searching works by giving it "quick filter" words.
export default function DataTable({ rows, columns, loading, error, searchLabel, pageSize = 10 }) {
  const [search, setSearch] = useState('')

  return (
    <Box>
      <TextField
        label={searchLabel}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        size="small"
        sx={{ mb: 2, width: { xs: '100%', sm: 360 } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Card>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          autoHeight
          disableRowSelectionOnClick
          pageSizeOptions={[5, 10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize } } }}
          filterModel={{ items: [], quickFilterValues: search.split(' ').filter(Boolean) }}
        />
      </Card>
    </Box>
  )
}