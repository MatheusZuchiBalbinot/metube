import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '@ui';
import { ROUTES } from '@utils/routes';
import { useAuth } from '@hooks';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <Spinner fullPage />;
    }

    if (!user) {
        return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
