import { Play } from 'lucide-react';
import './pageLoader.css';

export default function PageLoader() {
    return (
        <div className="page-loader" aria-hidden="true">
            <div className="page-loader__core">
                <span className="page-loader__ring page-loader__ring--1" />
                <span className="page-loader__ring page-loader__ring--2" />
                <span className="page-loader__ring page-loader__ring--3" />
                <span className="page-loader__icon">
                    <Play size={20} fill="currentColor" strokeWidth={0} />
                </span>
            </div>
        </div>
    );
}
