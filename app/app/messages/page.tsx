"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/authClient";
import { students as studentsApi } from "../../../lib/api";
import { loadDemoDb } from "../../../lib/demoData";
import type { Student } from "../../../lib/types";

export default function MessagingPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [activeId, setActiveId] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ unreadOnly: true, channel: "All" });
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const list = await studentsApi.list(user);
      setStudents(list);
    })();
  }, [user]);

  const data = useMemo(() => {
    const db = loadDemoDb();
    const visibleIds = new Set(students.map((s) => s.id));
    const raw = (db?.messages ?? []).filter((m) => visibleIds.has(m.student_id));

    const grouped: Record<string, Message[]> = {};
    for (const m of raw) {
      const student = students.find((s) => s.id === m.student_id);
      const id = `c_${m.student_id}`;
      if (!grouped[id]) grouped[id] = [];
      grouped[id].push({
        id: m.id,
        from: m.from === "SLP" ? "SLP" : "Parent",
        time: new Date(m.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
        text: m.text,
      });

      if (!student) continue;
    }

    Object.values(grouped).forEach((msgs) => msgs.sort((a, b) => (a.id < b.id ? -1 : 1)));

    const conversations: Conversation[] = students.map((s) => {
      const id = `c_${s.id}`;
      const thread = grouped[id] ?? [];
      const last = thread[thread.length - 1];
      const unreadCount = raw.filter((m) => m.student_id === s.id && !m.read).length;
      return {
        id,
        title: `${s.name} (Parent)` ,
        channel: "Parent",
        time: last?.time ?? "-",
        preview: last?.text ?? "No messages yet",
        unreadCount,
        tags: (s.targets ?? []).slice(0, 2).map((t) => `/${t.phoneme.toLowerCase()}/ ${t.position}`),
        student: s.name,
        meta: `Targets: ${(s.targets ?? []).map((t) => `/${t.phoneme.toLowerCase()}/ ${t.position}`).join(" • ")}`,
      };
    });

    return { conversations, threads: grouped };
  }, [students]);

  useEffect(() => {
    if (!activeId && data.conversations.length) {
      setActiveId(data.conversations[0].id);
    }
  }, [activeId, data.conversations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.conversations
      .filter((c) => (filters.channel === "All" ? true : c.channel === filters.channel))
      .filter((c) => (filters.unreadOnly ? c.unreadCount > 0 : true))
      .filter((c) => (!q ? true : c.title.toLowerCase().includes(q)));
  }, [query, filters, data.conversations]);

  const active = useMemo(() => data.conversations.find((c) => c.id === activeId) || filtered[0], [data.conversations, filtered, activeId]);

  const [threads, setThreads] = useState<Record<string, Message[]>>({});
  useEffect(() => {
    setThreads(data.threads);
  }, [data.threads]);

  function send() {
    if (!active) return;
    const text = draft.trim();
    if (!text) return;

    setThreads((prev) => ({
      ...prev,
      [active.id]: [
        ...(prev[active.id] || []),
        {
          id: "m_" + Math.random().toString(36).slice(2, 8),
          from: "SLP",
          time: "Just now",
          text,
        },
      ],
    }));
    setDraft("");
  }

  return (
    <div className="text-[#161616] rounded-3xl p-4 md:p-6">
      <main className="mx-auto max-w-[1460px] py-2">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Messages</h1>
            <p className="text-sm text-black/60 mt-1">Communicate with students and parents, send homework reminders, and keep notes in one place.</p>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone="orange">{countUnread(data.conversations)} unread</Pill>
            <button className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white shadow">New message</button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 p-0 overflow-hidden">
            <div className="p-4 border-b border-black/10">
              <div className="flex items-center gap-2">
                <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10" placeholder="Search conversations" />
                <button className={`px-3 py-2 rounded-xl ring-1 ring-black/10 ${filters.unreadOnly ? "bg-[#FFE7E0] text-[#D94E3A]" : "bg-white"}`} onClick={() => setFilters((f) => ({ ...f, unreadOnly: !f.unreadOnly }))} title="Unread only">●</button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <SelectInline label="Channel" value={filters.channel} options={["All", "Student", "Parent"]} onChange={(v) => setFilters((f) => ({ ...f, channel: v }))} />
                <div className="flex flex-col gap-1"><div className="text-[11px] font-medium text-black/60">Quick</div><button className="px-3 py-2 rounded-xl bg-black/5 text-sm text-left">Overdue homework</button></div>
              </div>
            </div>

            <div className="divide-y divide-black/5">
              {filtered.map((c) => (
                <button key={c.id} onClick={() => setActiveId(c.id)} className={`w-full text-left p-4 hover:bg-black/[.02] ${c.id === active?.id ? "bg-[#FFF1EC]" : "bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-black/5 flex items-center justify-center">👪</div>
                      <div className="min-w-0"><div className="text-sm font-medium truncate">{c.title}</div><div className="text-xs text-black/60 truncate">{c.preview}</div></div>
                    </div>
                    <div className="flex flex-col items-end gap-2"><div className="text-xs text-black/50">{c.time}</div>{c.unreadCount > 0 && <Pill>{c.unreadCount}</Pill>}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">{c.tags.map((t) => <span key={t} className="text-xs px-2 py-1 rounded-lg bg-white ring-1 ring-black/10 text-black/70">{t}</span>)}</div>
                </button>
              ))}
              {filtered.length === 0 && <div className="p-6 text-sm text-black/60">No conversations found.</div>}
            </div>
          </Card>

          <Card className="lg:col-span-2 p-0 overflow-hidden">
            {active ? (
              <>
                <div className="p-4 border-b border-black/10 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap"><div className="text-lg font-medium truncate">{active.title}</div><span className="text-xs px-2 py-1 rounded-lg bg-[#FFE7E0] text-[#D94E3A] ring-1 ring-black/10">{active.channel}</span>{active.student ? <span className="text-xs px-2 py-1 rounded-lg bg-white ring-1 ring-black/10 text-black/70">Student: {active.student}</span> : null}</div>
                    <div className="text-sm text-black/60 mt-1">{active.meta}</div>
                  </div>
                  <div className="flex items-center gap-2"><Link href="/app/students" className="px-3 py-2 rounded-xl bg-white ring-1 ring-black/10">Open student</Link><button className="px-3 py-2 rounded-xl bg-black/5">Archive</button></div>
                </div>

                <div className="p-4 h-[520px] overflow-auto bg-gradient-to-b from-white to-black/[.02]"><div className="space-y-3">{(threads[active.id] || []).map((m) => <MessageBubble key={m.id} m={m} />)}</div></div>

                <div className="p-4 border-t border-black/10 bg-white">
                  <div className="flex flex-wrap items-center gap-2 mb-3"><button className="px-3 py-2 rounded-xl bg-black/5 text-sm">Template ▾</button><button className="px-3 py-2 rounded-xl bg-black/5 text-sm">Attach</button><button className="px-3 py-2 rounded-xl bg-black/5 text-sm">Send homework</button><button className="px-3 py-2 rounded-xl bg-black/5 text-sm">Schedule session</button><span className="text-xs text-black/50">PHI-safe: messages are encrypted.</span></div>
                  <div className="flex items-end gap-2"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} className="w-full resize-none px-3 py-2 rounded-xl ring-1 ring-black/10" placeholder="Write a message..." /><button onClick={send} className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white">Send</button></div>
                  <div className="mt-2 flex items-center justify-between text-xs text-black/50"><div>Tip: use templates for homework reminders and parent updates.</div><div>Enter to send - Shift+Enter for newline</div></div>
                </div>
              </>
            ) : (
              <div className="p-6 text-sm text-black/60">No conversations for this account yet.</div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white ring-1 ring-black/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] ${className}`}>{children}</section>;
}

function SelectInline({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-black/60">{label}</span>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full appearance-none bg-white px-2 py-2 rounded-xl ring-1 ring-black/10 text-sm text-black/70">{options.map((o) => <option key={o}>{o}</option>)}</select>
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black/40">▾</div>
      </div>
    </label>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone?: "orange" }) {
  const cls = tone === "orange" ? "bg-[#FFE7E0] text-[#D94E3A]" : "bg-black text-white";
  return <span className={`text-xs px-2 py-1 rounded-lg ${cls}`}>{children}</span>;
}

function MessageBubble({ m }: { m: Message }) {
  const isMe = m.from === "SLP";
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] rounded-2xl p-3 ring-1 ${isMe ? "bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white ring-black/10" : "bg-white text-black ring-black/10"}`}>
        <div className="text-xs opacity-80">{isMe ? "You" : m.from}</div>
        <div className="text-sm mt-1 whitespace-pre-wrap">{m.text}</div>
        <div className={`text-[11px] mt-2 ${isMe ? "text-white/80" : "text-black/50"}`}>{m.time}</div>
      </div>
    </div>
  );
}

type Message = {
  id: string;
  from: "Student" | "Parent" | "SLP";
  time: string;
  text: string;
};

type Conversation = {
  id: string;
  title: string;
  channel: "Student" | "Parent";
  time: string;
  preview: string;
  unreadCount: number;
  tags: string[];
  student?: string;
  meta: string;
};

function countUnread(list: Conversation[]) {
  return list.reduce((sum, c) => sum + c.unreadCount, 0);
}
