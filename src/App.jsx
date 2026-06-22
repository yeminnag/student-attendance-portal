import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext.jsx";
import { Layout } from "@/components/Layout.jsx";
import { ProtectedRoute } from "@/components/ProtectedRoute.jsx";
import { AttendanceHistory } from "@/pages/AttendanceHistory.jsx";
import { Dashboard } from "@/pages/Dashboard.jsx";
import { Login } from "@/pages/Login.jsx";

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
                                        <Route path="/attendance" element={<AttendanceHistory />} />
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
