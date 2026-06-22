import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";

export function ProtectedRoute({ children }) {
    const { user, loading, profile, profileError } = useAuth();

    if (loading) {
        return <div className="page-loading">読み込み中...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!profile) {
        return (
            <div className="auth-error-page">
                <p>{profileError ?? "プロフィールが見つかりません。"}</p>
                <p className="auth-error-hint">
                    管理者に連絡するか、<code>supabase/student-portal-setup.sql</code> が実行されているか確認してください。
                </p>
            </div>
        );
    }

    return children;
}
