import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileQuestion } from 'lucide-react';
import { Button } from '@ui';
import { ROUTES } from '@utils/routes';
import './notFound.css';

export default function NotFoundPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="not-found">
            <div className="not-found__body">
                <FileQuestion size={48} strokeWidth={1.25} className="not-found__icon" />
                <h1 className="not-found__title">{t('common.not_found_title', '404')}</h1>
                <p className="not-found__message">{t('common.not_found_message', 'This page does not exist.')}</p>
                <Button variant="primary" onClick={() => navigate(ROUTES.HOME)}>
                    {t('common.go_home', 'Go home')}
                </Button>
            </div>
        </div>
    );
}
