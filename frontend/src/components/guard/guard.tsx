import { Navigate } from 'react-router-dom';
import { useAuth } from '@context/useAuth';
import { Spinner } from '@ui';
import { ROUTES } from '@utils/routes';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <Spinner fullPage />;
    }

    if (!user) {
        return <Navigate to={ROUTES.LOGIN} replace />;
    }

    return <>{children}</>;
}
