"use client";
import React from "react";
import { loadWordBank, filterWordBank, uniquePhonemes, uniqueSyllables } from "../../../lib/wordbank";
import { useAuth } from "../../../lib/authClient";
import { exemplars as exemplarsApi } from "../../../lib/api";
import { Badge, Button, Card, CardContent, CardHeader, Input, Select } from "../../../components/ui";

export default function Library(){
  const { user } = useAuth();
  const [words,setWords]=React.useState<any[]>([]);
  const [filtered,setFiltered]=React.useState<any[]>([]);
  const [phonemes,setPhonemes]=React.useState<string[]>([]);
  const [syllables,setSyllables]=React.useState<number[]>([]);

  const [q,setQ]=React.useState("");
  const [phoneme,setPhoneme]=React.useState("");
  const [position,setPosition]=React.useState("");
  const [syll,setSyll]=React.useState("");
  const [exemplars,setExemplars]=React.useState<any[]>([]);

  React.useEffect(()=>{
    (async()=>{
      const wb = await loadWordBank();
      setWords(wb);
      setFiltered(wb.slice(0,50));
      setPhonemes(uniquePhonemes(wb));
      setSyllables(uniqueSyllables(wb));
      setExemplars(await exemplarsApi.listByUser(user!));
    })();
  },[user]);

  React.useEffect(()=>{
    const f = filterWordBank(words, {
      query: q || undefined,
      phoneme: phoneme || undefined,
      position: (position as any) || undefined,
      syllables: syll ? [Number(syll)] : undefined
    });
    setFiltered(f.slice(0,200));
  },[q,phoneme,position,syll,words]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold tracking-tight">Library</div>
        <div className="mt-1 text-sm text-ink-600">Browse your word bank and manage exemplars.</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm font-semibold">Word bank</div>
              <div className="text-xs text-ink-500">{filtered.length} matches</div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-4">
              <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search word…" />
              <Select value={phoneme} onChange={(e)=>setPhoneme(e.target.value)}>
                <option value="">Phoneme (any)</option>
                {phonemes.map(p=><option key={p} value={p}>{p}</option>)}
              </Select>
              <Select value={position} onChange={(e)=>setPosition(e.target.value)}>
                <option value="">Position (any)</option>
                <option value="initial">Initial</option>
                <option value="medial">Medial</option>
                <option value="final">Final</option>
              </Select>
              <Select value={syll} onChange={(e)=>setSyll(e.target.value)}>
                <option value="">Syllables (any)</option>
                {syllables.map(n=><option key={n} value={String(n)}>{n}</option>)}
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-xl2 border border-ink-200">
              <table className="min-w-full text-sm">
                <thead className="bg-ink-50 text-xs text-ink-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Word</th>
                    <th className="px-3 py-2 text-left">Syllables</th>
                    <th className="px-3 py-2 text-left">Phonemes</th>
                    <th className="px-3 py-2 text-left">Positions (selected phoneme)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200">
                  {filtered.map(w=>(
                    <tr key={w.word} className="hover:bg-ink-50">
                      <td className="px-3 py-2 font-medium">{w.word}</td>
                      <td className="px-3 py-2 text-ink-600">{w.syllable_count}</td>
                      <td className="px-3 py-2 text-ink-600">{w.phonemes.slice(0,10).join(" ")}{w.phonemes.length>10?"…":""}</td>
                      <td className="px-3 py-2 text-ink-600">
                        {phoneme ? (w.positions?.[phoneme]?.join(", ") ?? "—") : <span className="text-ink-400">Pick a phoneme to view positions</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-xs text-ink-500">
              Matching is strict: phoneme + position must exist in <code>positions[phoneme]</code>.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Exemplars</div>
              <Badge tone="gray">{exemplars.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {exemplars.length===0 ? (
              <div className="text-sm text-ink-600">
                No exemplars saved yet. Create them inside the Assign Homework wizard (Step 4).
              </div>
            ) : (
              <ul className="space-y-2">
                {exemplars.map(ex=>(
                  <li key={ex.id} className="rounded-xl2 border border-ink-200 p-3">
                    <div className="text-sm font-semibold">{ex.label ?? "Example"}</div>
                    <div className="mt-1 text-xs text-ink-500">{ex.media_type} • {new Date(ex.created_at).toLocaleDateString()}</div>
                    <div className="mt-2"><Badge tone="blue">{ex.scope}</Badge></div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
