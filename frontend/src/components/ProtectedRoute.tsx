import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { Spinner } from './ui'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()

    if (loading) {
        return <Spinner fullPage />
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}
