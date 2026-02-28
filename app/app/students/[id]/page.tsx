"use client";
import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "../../../../lib/authClient";
import { students as studentsApi, assignments as assignmentsApi } from "../../../../lib/api";
import { Badge, Button, Card, CardContent, CardHeader } from "../../../../components/ui";

const tabs = ["Overview","Homework","Notes","Targets"] as const;
type Tab = typeof tabs[number];

export default function StudentProfile(){
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const [tab,setTab]=React.useState<Tab>("Overview");
  const [student,setStudent]=React.useState<any>(null);
  const [assignments,setAssignments]=React.useState<any[]>([]);
  const [error,setError]=React.useState<string>("");

  React.useEffect(()=>{
    if (isLoading || !user?.id) return;
    (async()=>{
      try {
        setError("");
        const s = await studentsApi.get(user, id);
        setStudent(s);
        const a = await assignmentsApi.list(user);
        setAssignments(a.filter(x=>x.student_id===s.id));
      } catch (err: any) {
        setError(err?.message ?? "Failed to load student.");
      }
    })();
  },[isLoading,user,id]);

  if(isLoading || (!student && !error)){
    return <div className="rounded-xl2 border border-ink-200 bg-white p-6 shadow-subtle">Loading…</div>;
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-xl2 border border-ink-200 bg-white p-6 shadow-subtle">
        <div className="text-sm font-semibold text-ink-900">Couldn’t load student</div>
        <div className="text-sm text-ink-600">{error}</div>
        <div>
          <Link href="/app/students"><Button variant="secondary">Back to students</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-tight">{student.name}</div>
          <div className="mt-1 text-sm text-ink-600">Profile • practice summary • quick actions</div>
          <div className="mt-2 flex gap-2">
            {student.targets?.[0] ? <Badge tone="orange">{student.targets[0].phoneme} • {student.targets[0].position}</Badge> : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/app/students/${id}/assign-homework`}><Button>Assign homework</Button></Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-2">
            {tabs.map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                className={`rounded-xl2 px-3 py-1.5 text-sm font-medium ${tab===t ? "bg-nuvo-50 text-nuvo-800" : "text-ink-700 hover:bg-ink-50"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {tab==="Overview" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl2 border border-ink-200 p-4">
                <div className="text-sm font-semibold">Current target</div>
                <div className="mt-2 text-sm text-ink-600">
                  {student.targets?.[0] ? `${student.targets[0].phoneme} in ${student.targets[0].position} position` : "—"}
                </div>
              </div>
              <div className="rounded-xl2 border border-ink-200 p-4">
                <div className="text-sm font-semibold">Last 7 days</div>
                <div className="mt-2 text-sm text-ink-600">Practice summary placeholder (connect results API later).</div>
              </div>
              <div className="rounded-xl2 border border-ink-200 p-4 md:col-span-2">
                <div className="text-sm font-semibold">Quick notes</div>
                <div className="mt-2 text-sm text-ink-600">{student.notes ?? "—"}</div>
              </div>
            </div>
          ) : null}

          {tab==="Homework" ? (
            <div className="space-y-2">
              {assignments.length===0 ? (
                <div className="text-sm text-ink-600">No assignments yet. Assign homework to generate the Unity payload.</div>
              ) : (
                <ul className="space-y-2">
                  {assignments.map(a=>(
                    <li key={a.id} className="rounded-xl2 border border-ink-200 p-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold">{a.targets.phoneme} • {a.targets.position}</div>
                        <div className="text-xs text-ink-500">Due {a.due_date} • {a.items.length} items</div>
                      </div>
                      <Link href={`/app/homework/${a.id}`}><Button variant="secondary" size="sm">Open</Button></Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {tab==="Notes" ? (
            <div className="text-sm text-ink-600">{student.notes ?? "—"}</div>
          ) : null}

          {tab==="Targets" ? (
            <div className="space-y-2">
              {(student.targets ?? []).map((t:any, idx:number)=>(
                <div key={idx} className="rounded-xl2 border border-ink-200 p-3">
                  <div className="text-sm font-semibold">{t.phoneme} • {t.position}</div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
