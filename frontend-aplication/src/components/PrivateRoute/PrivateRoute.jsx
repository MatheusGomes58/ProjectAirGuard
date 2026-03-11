import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase/firebase.jsx';

/**
 * PrivateRoute — redirects unauthenticated users to "/"
 * Shows nothing (null) while Firebase is still resolving the auth state.
 */
const PrivateRoute = ({ children }) => {
    const [status, setStatus] = useState('loading'); // 'loading' | 'auth' | 'unauth'
    const location = useLocation();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setStatus(user ? 'auth' : 'unauth');
        });
        return unsubscribe;
    }, []);

    if (status === 'loading') return null;

    if (status === 'unauth') {
        return <Navigate to="/" replace state={{ from: location }} />;
    }

    return children;
};

export default PrivateRoute;
