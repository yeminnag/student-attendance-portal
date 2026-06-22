import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import { validateStudentNumber } from "@/utils/studentAuth.js";

function translateAuthError(message) {
    if (message === "Invalid login credentials") {
        return "学籍番号またはパスワードが正しくありません。";
    }
    if (message === "Email not confirmed") {
        return "アカウントが未確認です。管理者に連絡してください。";
    }
    return message;
}

export function Login() {
    const { user, loading, profile, profileError, signIn } = useAuth();
    const [studentNumber, setStudentNumber] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (!loading && user && profile) {
        return <Navigate to="/" replace />;
    }

    if (!loading && user && !profile) {
        return (
            <div className="login-page">
                <div className="login-card">
                    <p className="login-error">{profileError ?? "プロフィールが見つかりません。"}</p>
                    <p className="login-subtitle">
                        学生アカウントが未設定の可能性があります。管理者に連絡してください。
                    </p>
                </div>
            </div>
        );
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        const numberError = validateStudentNumber(studentNumber);
        if (numberError) {
            setError(numberError);
            return;
        }

        setSubmitting(true);
        try {
            await signIn(studentNumber, password);
        } catch (err) {
            setError(translateAuthError(err.message ?? "ログインに失敗しました"));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="login-page">
            <form className="login-card" onSubmit={handleSubmit}>
                <h1>出席率パンネル</h1>
                <p className="login-subtitle">読売理工医療福祉専門学校</p>

                <div className="input-box">
                    <label htmlFor="student-number">学籍番号</label>
                    <input
                        id="student-number"
                        type="text"
                        inputMode="numeric"
                        className="input-field"
                        value={studentNumber}
                        onChange={(e) => setStudentNumber(e.target.value)}
                        placeholder="123456"
                        autoComplete="username"
                        required
                    />
                    <small className="field-hint">
                        管理者が設定した学籍番号でログインします
                    </small>
                </div>

                <div className="input-box">
                    <label htmlFor="password">パスワード</label>
                    <input
                        id="password"
                        type="password"
                        className="input-field"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                    />
                </div>

                {error && <p className="login-error">{error}</p>}

                <button type="submit" className="login-btn" disabled={submitting}>
                    {submitting ? "ログイン中..." : "ログイン"}
                </button>
            </form>
        </div>
    );
}
