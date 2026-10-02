import { useCallback, useEffect, useState } from 'react'

import { apiFetch } from '../api.js'

// Loads data from the API when the component first appears, and offers reload()
export function useApi(path) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    // If the component goes away (or a newer request starts), ignore this request's result
    let ignore = false
    apiFetch(path)
      .then((result) => {
        if (ignore) return
        setData(result)
        setError('')
      })
      .catch((err) => {
        if (!ignore) setError(err.message)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [path, reloadCount])

  const reload = useCallback(() => {
    setLoading(true)
    setReloadCount((count) => count + 1)
  }, [])

  return { data, loading, error, reload }
}