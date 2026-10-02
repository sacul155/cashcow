const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// The API sends money as text such as "1200.00", so convert it to a number first
export const formatCurrency = (amount) => currency.format(Number(amount))

export const formatPercent = (value) => (value === null ? 'No data' : `${value}%`)