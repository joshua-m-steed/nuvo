"use client";
import React from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/authClient";
import { assignments as assignmentsApi } from "../../../lib/api";
import { Badge, Card, CardContent, CardHeader, Input, SkeletonRow, Button } from "../../../components/ui";

export default function HomeworkList(){
  const { user } = useAuth();
  const [q,setQ]=React.useState("");
  const [loading,setLoading]=React.useState(true);
  const [rows,setRows]=React.useState<any[]>([]);

  React.useEffect(()=>{
    (async()=>{
      setLoading(true);
      const a = await assignmentsApi.list(user!);
      setRows(a);
      setLoading(false);
    })();
  },[user]);

  const filtered = rows.filter(r => (r.targets?.phoneme ?? "").toLowerCase().includes(q.toLowerCase()) || (r.id ?? "").includes(q));

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold tracking-tight">Homework</div>
        <div className="mt-1 text-sm text-ink-600">All assignments in one place.</div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-sm">
              <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search by sound or ID…" />
            </div>
            <div className="text-sm text-ink-500">{filtered.length} assignments</div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div><SkeletonRow /><SkeletonRow /></div>
          ) : filtered.length===0 ? (
            <div className="text-sm text-ink-600">No assignments yet. Create one from a student profile.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-500">
                    <th className="py-2">Assignment</th>
                    <th className="py-2">Target</th>
                    <th className="py-2">Due</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {filtered.map(a=>(
                    <tr key={a.id} className="hover:bg-ink-50">
                      <td className="py-3 font-medium">{a.id}</td>
                      <td className="py-3"><Badge tone="orange">{a.targets.phoneme} • {a.targets.position}</Badge></td>
                      <td className="py-3 text-ink-600">{a.due_date}</td>
                      <td className="py-3 text-ink-600">{a.status}</td>
                      <td className="py-3 text-right">
                        <Link href={`/app/homework/${a.id}`}><Button variant="secondary" size="sm">Open</Button></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
