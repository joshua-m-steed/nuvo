"use client";
import React from "react";
import { useParams } from "next/navigation";
import { useAuth } from "../../../../lib/authClient";
import { assignments as assignmentsApi } from "../../../../lib/api";
import { Badge, Button, Card, CardContent, CardHeader } from "../../../../components/ui";
import { useToast } from "../../../../components/toast";

export default function HomeworkDetail(){
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { user } = useAuth();
  const { push } = useToast();
  const [a,setA]=React.useState<any>(null);

  React.useEffect(()=>{
    (async()=>{
      const res = await assignmentsApi.get(user!, assignmentId);
      setA(res);
    })();
  },[user,assignmentId]);

  if(!a) return <div className="rounded-xl2 border border-ink-200 bg-white p-6 shadow-subtle">Loading…</div>;

  async function copyPayload(){
    await navigator.clipboard.writeText(JSON.stringify(a, null, 2));
    push({ tone:"success", title:"Copied", message:"HomeworkAssignment JSON copied to clipboard." });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Assignment</div>
          <div className="mt-1 text-sm text-ink-600">{a.id}</div>
          <div className="mt-2"><Badge tone="orange">{a.targets.phoneme} • {a.targets.position}</Badge></div>
        </div>
        <Button onClick={copyPayload}>Copy Unity payload</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><div className="text-sm font-semibold">Summary</div></CardHeader>
          <CardContent className="space-y-2 text-sm text-ink-700">
            <div><span className="text-ink-500">Due:</span> {a.due_date}</div>
            <div><span className="text-ink-500">Days/week:</span> {a.schedule.days_per_week}</div>
            <div><span className="text-ink-500">Items:</span> {a.items.length}</div>
            <div><span className="text-ink-500">Reps:</span> {a.settings.reps}</div>
            <div><span className="text-ink-500">Game:</span> {a.items?.[0]?.minigame_id ?? "—"}</div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><div className="text-sm font-semibold">Words</div></CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {a.items.map((it:any)=>(
                <div key={it.item_id} className="rounded-xl2 border border-ink-200 p-3">
                  <div className="text-sm font-semibold">{it.prompt_text}</div>
                  <div className="mt-1 text-xs text-ink-500">{it.target_phoneme} • {it.target_position} • {it.syllable_count} syllables</div>
                  {it.exemplar_id ? <div className="mt-2 text-xs"><Badge tone="blue">Example attached</Badge></div> : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Unity HomeworkAssignment payload</div>
            <Badge tone="gray">schema_version {a.schema_version}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[520px] overflow-auto rounded-xl2 border border-ink-200 bg-ink-50 p-4 text-xs">
{JSON.stringify(a, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
