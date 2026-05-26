import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '@ui';
import { ROUTES } from '@utils';
import { useAuth } from '@hooks';

interface GuardProps {
    children: React.ReactNode
    required?: boolean
}

export default function Guard({ children, required = true }: GuardProps) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <Spinner fullPage />;
    }

    const isGuest = !user;

    if (required && isGuest) {
        return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
