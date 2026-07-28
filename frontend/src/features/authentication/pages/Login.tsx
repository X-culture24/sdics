import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Box, Container, Card, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material'
import toast from 'react-hot-toast'
import api from '../../../api/axios'
import { useAuth } from '../../../contexts/AuthContext'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.post('/auth/login', data)
      const { access_token, refresh_token, user } = response.data

      login(user, access_token, refresh_token)
      toast.success('Login successful!')
      navigate('/')
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Login failed'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Card sx={{ p: 4, width: '100%', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
              SDICS
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Strategic Digital Identification & Campaign System
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
              margin="normal"
              disabled={loading}
              variant="outlined"
            />

            <TextField
              fullWidth
              label="Password"
              type="password"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
              margin="normal"
              disabled={loading}
              variant="outlined"
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              type="submit"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Login'}
            </Button>
          </form>

          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 1 }}>
              Test Credentials:
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: 'text.secondary' }}>
              admin@sdics.tech / Admin123456
            </Typography>
          </Box>
        </Card>
      </Box>
    </Container>
  )
}
