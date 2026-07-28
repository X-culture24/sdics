import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container, Card, TextField, Button, Typography, Box, Alert } from '@mui/material'
import axios from 'axios'
import { useAuth } from '../../../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await axios.post('/api/v1/auth/login', { email, password })
      const { access_token, refresh_token, user } = response.data
      login(user, access_token, refresh_token)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Card sx={{ p: 4, width: '100%' }}>
          <Typography variant="h4" sx={{ mb: 1, textAlign: 'center', color: 'primary.main' }}>SDICS</Typography>
          <Typography variant="body2" sx={{ mb: 3, textAlign: 'center', color: 'text.secondary' }}>Strategic Digital Identification & Campaign System</Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} margin="normal" disabled={loading} />
            <TextField fullWidth label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} margin="normal" disabled={loading} />
            <Button fullWidth variant="contained" type="submit" sx={{ mt: 2 }} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <Typography variant="caption" sx={{ display: 'block', mt: 2, textAlign: 'center', color: 'text.secondary' }}>
            Test: admin@sdics.tech / Admin123456
          </Typography>
        </Card>
      </Box>
    </Container>
  )
}
