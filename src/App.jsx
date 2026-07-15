import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext.jsx";
import { Layout } from "@/components/Layout.jsx";
import { ProtectedRoute } from "@/components/ProtectedRoute.jsx";
import { Login } from "@/pages/Login.jsx";
import { Dashboard } from "@/pages/Dashboard.jsx";

const Schedule = lazy(() =>
    import("@/pages/Schedule.jsx").then((module) => ({ default: module.Schedule }))
);
const AttendanceHistory = lazy(() =>
    import("@/pages/AttendanceHistory.jsx").then((module) => ({
        default: module.AttendanceHistory,
    }))
);
const Messages = lazy(() =>
    import("@/pages/Messages.jsx").then((module) => ({ default: module.Messages }))
);
const Notifications = lazy(() =>
    import("@/pages/Notifications.jsx").then((module) => ({
        default: module.Notifications,
    }))
);

function PageFallback() {
    return <div className="page-loading">読み込み中...</div>;
}

function LazyPage({ children }) {
    return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/*"
                        element={
                            <ProtectedRoute>
                                <Routes>
                                    <Route element={<Layout />}>
                                        <Route path="/" element={<Dashboard />} />
                                        <Route
                                            path="/schedule"
                                            element={
                                                <LazyPage>
                                                    <Schedule />
                                                </LazyPage>
                                            }
                                        />
                                        <Route
                                            path="/attendance"
                                            element={
                                                <LazyPage>
                                                    <AttendanceHistory />
                                                </LazyPage>
                                            }
                                        />
                                        <Route
                                            path="/messages"
                                            element={
                                                <LazyPage>
                                                    <Messages />
                                                </LazyPage>
                                            }
                                        />
                                        <Route
                                            path="/notifications"
                                            element={
                                                <LazyPage>
                                                    <Notifications />
                                                </LazyPage>
                                            }
                                        />
                                        <Route path="*" element={<Navigate to="/" replace />} />
                                    </Route>
                                </Routes>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
