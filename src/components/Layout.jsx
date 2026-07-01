import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";

export function Layout() {
    const { student, signOut } = useAuth();

    return (
        <div className="app-shell">
            <header className="topbar">
                <div>
                    <h1>{student?.name ?? "学生"}</h1>
                    <p className="topbar-meta">学籍番号 {student?.student_number ?? "—"}</p>
                </div>
                <button type="button" className="logout-btn" onClick={signOut}>
                    ログアウト
                </button>
            </header>

            <nav className="tab-nav">
                <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
                    ホーム
                </NavLink>
                <NavLink to="/schedule" className={({ isActive }) => (isActive ? "active" : "")}>
                    時間割
                </NavLink>
                <NavLink to="/attendance" className={({ isActive }) => (isActive ? "active" : "")}>
                    出席詳細
                </NavLink>
                <NavLink to="/messages" className={({ isActive }) => (isActive ? "active" : "")}>
                    メッセージ
                </NavLink>
            </nav>

            <main className="page-content">
                <Outlet />
            </main>
        </div>
    );
}
