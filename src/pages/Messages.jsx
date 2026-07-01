import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import {
    buildConversationList,
    fetchMessagesWithPartner,
    fetchRecentMessages,
    fetchTeachersForStudentSubjects,
    markConversationRead,
    sendMessage,
    subscribeToMessages,
} from "@/utils/messageFunctions.js";

function formatMessageTime(value) {
    if (!value) return "";
    const date = new Date(value);
    return date.toLocaleString("ja-JP", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getTeacherTabLabel(name) {
    if (!name) return "—";
    const first = name.trim().split(/[\s　]+/)[0];
    if (first.length <= 4) return first;
    return first.slice(0, 3);
}

function getTeacherInitial(name) {
    return getTeacherTabLabel(name).slice(0, 1);
}

export function Messages() {
    const { user, studentId } = useAuth();
    const [messages, setMessages] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [selectedPartnerId, setSelectedPartnerId] = useState(null);
    const [threadMessages, setThreadMessages] = useState([]);
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const threadRef = useRef(null);
    const teacherTabRef = useRef(null);

    const profilesById = useMemo(
        () => new Map(contacts.map((contact) => [contact.id, contact])),
        [contacts]
    );

    const conversations = useMemo(
        () => buildConversationList(user?.id, messages, profilesById),
        [user?.id, messages, profilesById]
    );

    const selectedPartner = profilesById.get(selectedPartnerId) ?? null;

    const unreadByPartnerId = useMemo(() => {
        const map = new Map();
        for (const conversation of conversations) {
            map.set(conversation.partnerId, conversation.unreadCount);
        }
        return map;
    }, [conversations]);

    useEffect(() => {
        if (contacts.length === 0 || selectedPartnerId) return;
        setSelectedPartnerId(contacts[0].id);
    }, [contacts, selectedPartnerId]);

    useEffect(() => {
        if (!user?.id || !studentId) return;

        async function loadContacts() {
            setLoading(true);
            const { data, error } = await fetchTeachersForStudentSubjects(studentId);
            if (error) {
                console.error("Failed to load teachers:", error);
            }
            setContacts(data ?? []);

            const { data: recentMessages } = await fetchRecentMessages(user.id);
            setMessages(recentMessages ?? []);
            setLoading(false);
        }

        loadContacts();
    }, [user?.id, studentId]);

    useEffect(() => {
        if (!user?.id || !selectedPartnerId) {
            setThreadMessages([]);
            return;
        }

        async function loadThread() {
            const { data, error } = await fetchMessagesWithPartner(user.id, selectedPartnerId);
            if (error) return;
            setThreadMessages(data ?? []);
            await markConversationRead(selectedPartnerId);
        }

        loadThread();
    }, [user?.id, selectedPartnerId]);

    useEffect(() => {
        if (!user?.id) return undefined;

        return subscribeToMessages(user.id, () => {
            fetchRecentMessages(user.id).then(({ data }) => {
                if (data) setMessages(data);
            });
            if (selectedPartnerId) {
                fetchMessagesWithPartner(user.id, selectedPartnerId).then(({ data }) => {
                    if (data) setThreadMessages(data);
                });
            }
        });
    }, [user?.id, selectedPartnerId]);

    useEffect(() => {
        if (!threadRef.current) return;
        threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }, [threadMessages]);

    function selectTeacher(partnerId) {
        setSelectedPartnerId(partnerId);

        if (!window.matchMedia("(max-width: 768px)").matches) return;

        requestAnimationFrame(() => {
            const strip = teacherTabRef.current;
            const active = strip?.querySelector(".teacher-tab.active");
            active?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        });
    }

    async function handleSend(event) {
        event.preventDefault();
        if (!selectedPartnerId || !draft.trim() || sending) return;

        setSending(true);
        const { data, error } = await sendMessage(selectedPartnerId, draft);
        setSending(false);

        if (error) {
            alert(error.message);
            return;
        }

        setDraft("");
        if (data) {
            setThreadMessages((current) => [...current, data]);
            setMessages((current) => [data, ...current]);
        }
    }

    if (loading) {
        return <div className="page-loading">読み込み中...</div>;
    }

    return (
        <div className="messages-page">
            <div className="panel-header">
                <div>
                    <h2>メッセージ</h2>
                    <p className="panel-subtitle">担当教員に連絡できます（例: 本日欠席します）</p>
                </div>
            </div>

            {contacts.length > 0 && (
                <div className="teacher-tab-strip" ref={teacherTabRef}>
                    {contacts.map((contact) => (
                        <button
                            key={contact.id}
                            type="button"
                            className={`teacher-tab${
                                selectedPartnerId === contact.id ? " active" : ""
                            }`}
                            onClick={() => selectTeacher(contact.id)}
                        >
                            <span className="teacher-tab-circle">
                                {getTeacherInitial(contact.name)}
                                {(unreadByPartnerId.get(contact.id) ?? 0) > 0 && (
                                    <span className="teacher-tab-badge" />
                                )}
                            </span>
                            <span className="teacher-tab-label">
                                {getTeacherTabLabel(contact.name)}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            <div className="chat-layout">
                <aside className="chat-sidebar chat-sidebar-desktop">
                    <div className="chat-sidebar-section">
                        <h3>会話</h3>
                        {conversations.length === 0 ? (
                            <p className="chat-empty">会話はまだありません</p>
                        ) : (
                            conversations.map((conversation) => (
                                <button
                                    key={conversation.partnerId}
                                    type="button"
                                    className={`chat-contact${
                                        selectedPartnerId === conversation.partnerId ? " active" : ""
                                    }`}
                                    onClick={() => selectTeacher(conversation.partnerId)}
                                >
                                    <span className="chat-contact-name">
                                        {conversation.partner.name}
                                        {conversation.unreadCount > 0 && (
                                            <span className="chat-unread">{conversation.unreadCount}</span>
                                        )}
                                    </span>
                                    <span className="chat-contact-preview">{conversation.lastMessage.body}</span>
                                </button>
                            ))
                        )}
                    </div>

                    <div className="chat-sidebar-section">
                        <h3>担当教員</h3>
                        {contacts.length === 0 ? (
                            <p className="chat-empty">担当教員が見つかりません</p>
                        ) : (
                            contacts.map((contact) => (
                                <button
                                    key={contact.id}
                                    type="button"
                                    className={`chat-contact${
                                        selectedPartnerId === contact.id ? " active" : ""
                                    }`}
                                    onClick={() => selectTeacher(contact.id)}
                                >
                                    <span className="chat-contact-name">{contact.name}</span>
                                    <span className="chat-contact-preview">{contact.subjectName}</span>
                                </button>
                            ))
                        )}
                    </div>
                </aside>

                <section className="chat-thread">
                    {!selectedPartner ? (
                        <div className="chat-placeholder">教員を選んでメッセージを送ってください。</div>
                    ) : (
                        <>
                            <div className="chat-thread-header">
                                <strong>{selectedPartner.name}</strong>
                                <span>{selectedPartner.subjectName}</span>
                            </div>

                            <div className="chat-messages" ref={threadRef}>
                                {threadMessages.length === 0 ? (
                                    <p className="chat-empty">まだメッセージはありません。</p>
                                ) : (
                                    threadMessages.map((message) => {
                                        const mine = message.sender_id === user.id;
                                        return (
                                            <div
                                                key={message.id}
                                                className={`chat-bubble-row${mine ? " mine" : ""}`}
                                            >
                                                <div className={`chat-bubble${mine ? " mine" : ""}`}>
                                                    <p>{message.body}</p>
                                                    <time>{formatMessageTime(message.created_at)}</time>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <form className="chat-compose" onSubmit={handleSend}>
                                <textarea
                                    value={draft}
                                    onChange={(event) => setDraft(event.target.value)}
                                    placeholder="例: 本日欠席します"
                                    rows={3}
                                />
                                <button type="submit" disabled={sending || !draft.trim()}>
                                    送信
                                </button>
                            </form>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
