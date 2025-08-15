import React, { useState } from 'react';
import './App.css';

interface AdminTabProps {
    showPoints: boolean;
    setShowPoints: (show: boolean) => void;
    isAdmin: boolean;
    onAdminAuth: (authenticated: boolean) => void;
}

const AdminTab: React.FC<AdminTabProps> = ({
                                               showPoints,
                                               setShowPoints,
                                               isAdmin,
                                               onAdminAuth
                                           }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password ===  process.env.REACT_APP_ADMIN) {
            onAdminAuth(true);
            setError('');
        } else {
            setError('Invalid password');
            setPassword('');
        }
    };

    const handleLogout = () => {
        onAdminAuth(false);
        setPassword('');
        setError('');
    };

    if (!isAdmin) {
        return (
            <>
                <div className="details-header">
                    <h2 className="details-title">Admin Settings</h2>
                </div>

                <form onSubmit={handlePasswordSubmit}>
                    <div className="section">
                        <div className="section-title">Enter admin password to access settings:</div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="competitor-input"
                            placeholder="Admin Password"
                            required
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="section">
                        <button type="submit" className="level-button">
                            Access Admin Settings
                        </button>
                    </div>
                </form>

                <div className="section">
                    <div className="section-title" style={{ marginTop: '24px', fontSize: '14px', color: '#6b7280' }}>
                        Admin Access Required For:
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                        • View score details and point values<br/>
                        • Export functionality<br/>
                        • Saved competitors management<br/>
                        • Display settings configuration
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="details-header">
                <h2 className="details-title">Admin Settings</h2>
                <button onClick={handleLogout} className="level-button">
                    Logout Admin
                </button>
            </div>

            <div className="section">
                <div className="section-title">Display Settings:</div>
                <button
                    onClick={() => setShowPoints(!showPoints)}
                    className={`feature-button ${showPoints ? 'feature-active' : ''}`}
                    style={{ width: '200px' }}
                >
                    {showPoints ? 'Hide Points (Enabled)' : 'Show Points (Disabled)'}
                </button>
                <div className="selected-features" style={{ marginTop: '8px' }}>
                    {showPoints ?
                        'Point values are currently visible to all users in scoring interface' :
                        'Point values are currently hidden from scoring interface'
                    }
                </div>
            </div>

            <div className="section">
                <div className="section-title">Admin Privileges Active:</div>
                <div className="selected-features">
                    ✅ Score details and point values visible<br/>
                    ✅ Export functionality enabled<br/>
                    ✅ Saved competitors management enabled<br/>
                    ✅ Display settings configuration enabled
                </div>
            </div>
        </>
    );
};

export default AdminTab;