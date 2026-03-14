import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import './pageLoader.css';

export default function PageLoader() {
    return (
        <motion.div
            className="page-loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            aria-hidden="true"
        >
            <motion.div
                className="page-loader__core"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
                <span className="page-loader__ring page-loader__ring--1" />
                <span className="page-loader__ring page-loader__ring--2" />
                <span className="page-loader__ring page-loader__ring--3" />
                <span className="page-loader__icon">
                    <Play size={20} fill="currentColor" strokeWidth={0} />
                </span>
            </motion.div>
        </motion.div>
    );
}
