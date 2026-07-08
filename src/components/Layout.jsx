import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications.js";

const navItems = [
    {
        to: "/",
        end: true,
        label: "ホーム",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" aria-hidden="true">
                <path d="M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z" />
            </svg>
        ),
    },
    {
        to: "/schedule",
        label: "時間割",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" aria-hidden="true">
                <path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Zm80 240v-80h80v80h-80Zm120 0v-80h80v80h-80Zm120 0v-80h80v80h-80Zm120 0v-80h80v80h-80ZM320-240v-80h80v80h-80Zm120 0v-80h80v80h-80Zm120 0v-80h80v80h-80Zm120 0v-80h80v80h-80Z" />
            </svg>
        ),
    },
    {
        to: "/attendance",
        label: "出席",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" aria-hidden="true">
                <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-240L280-520l56-56 104 103v-407h80v407l104-103 56 56-200 200Z" />
            </svg>
        ),
    },
    {
        to: "/messages",
        label: "メッセージ",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" aria-hidden="true">
                <path d="M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm80-80h640v-480H160v525l80-65Zm0 0v-480 480Z" />
            </svg>
        ),
    },
    {
        to: "/notifications",
        label: "通知",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" aria-hidden="true">
                <path d="M160-200v-80h80v-80q0-83 50-147.5T420-552v-28q0-25 17.5-42.5T480-640q25 0 42.5 17.5T540-580v28q54 20 87 84t33 148v80h80v80H160Zm320-320q-33 0-56.5-23.5T400-600h160q0 33-23.5 56.5T480-520Zm0 440q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80Z" />
            </svg>
        ),
    },
];

export function Layout() {
    const { student, studentId, signOut } = useAuth();
    const { hasUnread } = useUnreadNotifications(studentId);
    const location = useLocation();

    function renderNavItem(item, keyPrefix) {
        const showDot = item.to === "/notifications" && hasUnread && location.pathname !== "/notifications";

        return (
            <NavLink
                key={`${keyPrefix}-${item.to}`}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? "active" : "")}
            >
                <span className="app-nav-icon-wrap">
                    <span className="app-nav-icon">{item.icon}</span>
                    {showDot && <span className="nav-unread-dot" aria-hidden="true" />}
                </span>
                <span className="app-nav-label">
                    {item.label}
                    {showDot && <span className="nav-unread-dot-label" aria-hidden="true" />}
                </span>
            </NavLink>
        );
    }

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

            <nav className="app-nav app-nav-top" aria-label="メインメニュー">
                {navItems.map((item) => renderNavItem(item, "top"))}
            </nav>

            <main className="page-content">
                <Outlet />
            </main>

            <nav className="app-nav app-nav-bottom" aria-label="モバイルメニュー">
                {navItems.map((item) => renderNavItem(item, "mobile"))}
            </nav>
        </div>
    );
}
