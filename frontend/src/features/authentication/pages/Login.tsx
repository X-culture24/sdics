import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Box, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material'
import toast from 'react-hot-toast'
import apiClient from '../../../api/axios'
import { useAuthStore } from '../store/authStore'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.post('/auth/login', data)
      const { access_token, user } = response.data

      // Use authStore to set auth state
      setAuth(user, access_token, [])
      toast.success('Login successful!')
      navigate('/')
    } catch (err: any) {
      console.error('Login error:', err)
      const message = err.response?.data?.error?.message || err.message || 'Login failed'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#fff' }}>
      {/* Blue Left Side */}
      <Box sx={{
        flex: 1,
        background: 'linear-gradient(135deg, #0056A6 0%, #003D7A 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        color: 'white',
      }}>
        <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
          <img 
            src="/logo.png" 
            alt="Government Logo" 
            style={{ 
              width: 120, 
              height: 120, 
              borderRadius: '50%',
              marginBottom: 24,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              backgroundColor: 'rgba(255,255,255,0.1)',
              padding: 8
            }} 
          />
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
            SDICS
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 300, mb: 3, opacity: 0.95 }}>
            Strategic Digital Identification & Campaign System
          </Typography>
          <Box sx={{ 
            borderTop: '2px solid rgba(255,255,255,0.3)', 
            pt: 3,
            mt: 3
          }}>
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 2, lineHeight: 1.8 }}>
              A comprehensive platform for managing voter registration campaigns and citizen identification across Kenya's 47 counties.
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Secure • Scalable • Reliable
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* White Right Side - Login Form */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        background: '#fff',
      }}>
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#1F2937' }}>
            Welcome Back
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280', mb: 3 }}>
            Sign in to access the SDICS platform
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              placeholder="admin@sdics.tech"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
              margin="normal"
              disabled={loading}
              variant="outlined"
              autoComplete="email"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#0056A6',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#0056A6',
                  },
                },
              }}
            />

            <TextField
              fullWidth
              label="Password"
              type="password"
              placeholder="Enter your password"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
              margin="normal"
              disabled={loading}
              variant="outlined"
              autoComplete="current-password"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#0056A6',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#0056A6',
                  },
                },
              }}
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              type="submit"
              disabled={loading}
              sx={{
                mt: 4,
                mb: 2,
                background: 'linear-gradient(135deg, #0056A6 0%, #003D7A 100%)',
                fontWeight: 600,
                py: 1.5,
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: 'white' }} />
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <Box sx={{ 
            mt: 3, 
            pt: 3, 
            borderTop: '1px solid #E5E7EB',
            textAlign: 'center'
          }}>
            <Typography variant="caption" sx={{ color: '#6B7280', display: 'block' }}>
              © 2026 Strategic Digital Identification & Campaign System
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
