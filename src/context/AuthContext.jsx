import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase.js";
import { fetchStudentProfile } from "@/utils/studentData.js";
import { studentNumberToAuthEmail } from "@/utils/studentAuth.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [student, setStudent] = useState(null);
    const [profileError, setProfileError] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadSession = useCallback(async (sessionUser) => {
        if (!sessionUser) {
            setUser(null);
            setProfile(null);
            setStudent(null);
            setProfileError(null);
            setLoading(false);
            return;
        }

        try {
            const { data: profileData, error } = await fetchStudentProfile(sessionUser.id);
            if (error) throw error;
            if (!profileData) {
                throw new Error("プロフィールが見つかりません。");
            }
            if (profileData.role !== "student" || !profileData.student_id) {
                throw new Error("このアカウントは学生用ではありません。");
            }

            setUser(sessionUser);
            setProfile(profileData);
            setStudent(profileData.students ?? null);
            setProfileError(null);
        } catch (err) {
            setUser(sessionUser);
            setProfile(null);
            setStudent(null);
            setProfileError(err.message ?? "プロフィールの読み込みに失敗しました");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            loadSession(session?.user ?? null);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "TOKEN_REFRESHED") return;
            setLoading(true);
            loadSession(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [loadSession]);

    const signIn = useCallback(async (studentNumber, password) => {
        const { error } = await supabase.auth.signInWithPassword({
            email: studentNumberToAuthEmail(studentNumber),
            password,
        });
        if (error) throw error;
    }, []);

    const signOut = useCallback(async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }, []);

    const contextValue = useMemo(
        () => ({
            user,
            profile,
            student,
            studentId: profile?.student_id ?? null,
            profileError,
            loading,
            signIn,
            signOut,
        }),
        [user, profile, student, profileError, loading, signIn, signOut]
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
