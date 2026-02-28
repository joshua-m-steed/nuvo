"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/authClient";

type Tone = "stone" | "amber" | "emerald" | "violet";

type CustomWord = {
  word: string;
  syllable_count: number;
  phonemes: string[];
  positions: Record<string, Array<"initial" | "medial" | "final">>;
};

const CUSTOM_WORDS_KEY = "nuvo_custom_words_v1";

export default function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <div className="text-[#161616] rounded-3xl p-4 md:p-6">
      <main className="mx-auto max-w-[1460px] py-2">
        <div className="mb-4 flex justify-end">
          <button
            className="px-4 py-2 rounded-xl bg-white ring-1 ring-black/10"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            Sign out
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1 rounded-2xl bg-white ring-1 ring-black/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-4 h-fit sticky top-24">
            <h2 className="text-lg font-semibold mb-3">Settings</h2>
            <nav className="space-y-1 text-sm">
              {[
                "Profile",
                "Organization",
                "Notifications",
                "Privacy & Compliance",
                "Roles & Permissions",
                "Integrations",
                "Templates",
                "Word Library",
                "Data & Export",
                "Billing",
                "Developer",
                "Danger Zone",
              ].map((item) => (
                <a key={item} href={`#${slug(item)}`} className="block px-3 py-2 rounded-lg hover:bg-black/[.04]">
                  {item}
                </a>
              ))}
            </nav>
          </aside>

          <section className="lg:col-span-3 space-y-6">
            <Group id="profile" title="Profile">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Full name"><input className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10" defaultValue="Brenna Hakes"/></Field>
                <Field label="Email"><input className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10" defaultValue="brenna@example.com"/></Field>
                <Field label="Phone"><input className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10" placeholder="(xxx) xxx-xxxx"/></Field>
                <Field label="Timezone"><Select options={["America/Denver","America/Chicago","America/New_York"]}/></Field>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="px-4 py-2 rounded-xl bg-white ring-1 ring-black/10">Cancel</button>
                <button className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white">Save changes</button>
              </div>
            </Group>

            <Group id="organization" title="Organization">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Clinic name"><input className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10" defaultValue="NUVO Speech Clinic"/></Field>
                <Field label="Address"><input className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10" placeholder="123 Main St, City, ST"/></Field>
                <Field label="Default session length"><Select options={["30 min","45 min","60 min"]}/></Field>
                <Field label="Default location"><Select options={["Clinic","School","Telehealth"]}/></Field>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <Tile title="Active SLPs" metric="8"/>
                <Tile title="Students" metric="124"/>
                <Tile title="Groups" metric="17"/>
              </div>
            </Group>

            <Group id="notifications" title="Notifications">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SwitchField label="Email: daily agenda" defaultChecked/>
                <SwitchField label="Email: no-show alerts" defaultChecked/>
                <SwitchField label="Email: parent replies" defaultChecked/>
                <SwitchField label="SMS: session reminders" />
                <SwitchField label="Push: homework streaks" defaultChecked/>
              </div>
              <div className="mt-3 text-xs text-black/60">We respect your privacy. You can opt out anytime.</div>
            </Group>

            <Group id="privacy-compliance" title="Privacy & Compliance">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="HIPAA BAA status"><Badge tone="emerald">Active</Badge></Field>
                <Field label="Data retention"><Select options={["1 year","3 years","7 years","Custom..."]}/></Field>
                <Field label="Consent renewals"><Select options={["Annually","Biannually","On expiration only"]}/></Field>
                <Field label="PHI export watermark"><Select options={["On","Off"]}/></Field>
              </div>
              <div className="mt-3 text-sm text-black/70 leading-relaxed">
                NUVO encrypts data at rest and in transit. Access is role-based with audit logs.
                For HIPAA: we offer a signed BAA, least-privilege defaults, and optional ePHI export watermarks.
              </div>
            </Group>

            <Group id="roles-permissions" title="Roles & Permissions">
              <div className="rounded-2xl ring-1 ring-black/10 p-3">
                <table className="w-full text-sm">
                  <thead className="text-left text-black/60">
                    <tr className="border-b border-black/10">
                      <th className="p-2">Role</th>
                      <th className="p-2">Schedule</th>
                      <th className="p-2">Clinical</th>
                      <th className="p-2">Reports</th>
                      <th className="p-2">Billing</th>
                      <th className="p-2">Admin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map(r => (
                      <tr key={r.role} className="border-b border-black/5">
                        <td className="p-2 font-medium">{r.role}</td>
                        {r.perms.map((p,i)=> (
                          <td key={i} className="p-2"><Checkbox defaultChecked={p} /></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Group>

            <Group id="integrations" title="Integrations">
              <IntegrationRow name="Google Calendar" status="Connected" action="Manage"/>
              <IntegrationRow name="School SIS / EMR" status="Not connected" action="Connect"/>
              <IntegrationRow name="Stripe (Billing)" status="Connected" action="Manage"/>
            </Group>

            <Group id="templates" title="Templates">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Default report template"><Select options={["Parent Update","IEP Quarterly","Discharge"]}/></Field>
                <Field label="Saved views"><Select options={["My Clinic – Monthly","Low Accuracy – Last 7d"]}/></Field>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="px-3 py-2 rounded-xl bg-white ring-1 ring-black/10">New Template</button>
                <button className="px-3 py-2 rounded-xl bg-black/5">Import</button>
              </div>
            </Group>

            <Group id="word-library" title="Word Library">
              <WordLibraryEditor />
            </Group>

            <Group id="data-export" title="Data & Export">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Export format"><Select options={["CSV","JSON","PDF (reports)"]}/></Field>
                <Field label="Export range"><Select options={["Last 30 days","Quarter to date","All time"]}/></Field>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white">Export Now</button>
                <button className="px-4 py-2 rounded-xl bg-white ring-1 ring-black/10">Schedule Export</button>
              </div>
            </Group>

            <Group id="billing" title="Billing">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Plan"><Badge tone="violet">Pro</Badge></Field>
                <Field label="Seats used"><div className="text-sm">8 / 10</div></Field>
                <Field label="Next invoice"><div className="text-sm">Dec 1, 2025</div></Field>
                <Field label="Payment method"><div className="text-sm">Visa •••• 4242</div></Field>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="px-3 py-2 rounded-xl bg-white ring-1 ring-black/10">Manage Plan</button>
                <button className="px-3 py-2 rounded-xl bg-black/5">Update Card</button>
              </div>
            </Group>

            <Group id="developer" title="Developer">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="API Key"><ApiKey /></Field>
                <Field label="Webhooks"><Select options={["Off","Errors only","All events"]}/></Field>
              </div>
              <div className="mt-3 text-xs text-black/60">Keep your API keys secret. Rotate regularly.</div>
            </Group>

            <Group id="danger-zone" title="Danger Zone">
              <div className="rounded-2xl ring-1 ring-rose-200 bg-rose-50 p-3">
                <div className="text-sm font-medium text-rose-700">Delete organization</div>
                <p className="text-sm text-rose-700/80 mt-1">This will permanently remove all data. This action cannot be undone.</p>
                <button className="mt-3 px-4 py-2 rounded-xl bg-rose-600 text-white">Delete Organization</button>
              </div>
            </Group>
          </section>
        </div>
      </main>
    </div>
  );
}

function WordLibraryEditor() {
  const [coreCount, setCoreCount] = useState(0);
  const [search, setSearch] = useState("");
  const [words, setWords] = useState<CustomWord[]>([]);
  const [form, setForm] = useState({
    word: "",
    syllables: 1,
    phonemes: "",
    positions: ["initial"] as Array<"initial" | "medial" | "final">,
  });
  const [editIndex, setEditIndex] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/word_bank.json", { cache: "force-cache" });
        const data = await res.json();
        if (Array.isArray(data)) setCoreCount(data.length);
      } catch {
        setCoreCount(0);
      }
    })();

    try {
      const raw = localStorage.getItem(CUSTOM_WORDS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setWords(Array.isArray(parsed) ? parsed : []);
    } catch {
      setWords([]);
    }
  }, []);

  const filtered = useMemo(
    () => words.filter((w) => w.word.toLowerCase().includes(search.toLowerCase())),
    [words, search]
  );

  function saveWords(next: CustomWord[]) {
    setWords(next);
    localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(next));
  }

  function clearForm() {
    setForm({ word: "", syllables: 1, phonemes: "", positions: ["initial"] });
    setEditIndex(null);
  }

  function submitWord() {
    const word = form.word.trim().toLowerCase();
    const phonemes = form.phonemes
      .split(",")
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean);
    if (!word || !phonemes.length || !form.positions.length) return;

    const positions: Record<string, Array<"initial" | "medial" | "final">> = {};
    for (const p of phonemes) positions[p] = [...form.positions];

    const entry: CustomWord = {
      word,
      syllable_count: Math.max(1, Number(form.syllables) || 1),
      phonemes,
      positions,
    };

    if (editIndex === null) {
      saveWords([entry, ...words]);
    } else {
      const next = [...words];
      next[editIndex] = entry;
      saveWords(next);
    }

    clearForm();
  }

  function loadForEdit(word: CustomWord, index: number) {
    const firstPositions = Object.values(word.positions)[0] ?? ["initial"];
    setForm({
      word: word.word,
      syllables: word.syllable_count,
      phonemes: word.phonemes.join(", "),
      positions: [...firstPositions],
    });
    setEditIndex(index);
  }

  function removeWord(index: number) {
    const next = words.filter((_, i) => i !== index);
    saveWords(next);
    if (editIndex === index) clearForm();
  }

  function togglePosition(pos: "initial" | "medial" | "final") {
    setForm((f) => {
      const has = f.positions.includes(pos);
      const next = has ? f.positions.filter((x) => x !== pos) : [...f.positions, pos];
      return { ...f, positions: next.length ? next : ["initial"] };
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl ring-1 ring-black/10 p-3 bg-stone-50 text-sm text-black/70">
        Core library words: <span className="font-medium text-black">{coreCount}</span> (read-only) • Custom words: <span className="font-medium text-black">{words.length}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Word text"><input value={form.word} onChange={(e)=>setForm((f)=>({...f, word:e.target.value}))} className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10" placeholder="e.g., rabbit"/></Field>
        <Field label="Syllables"><input type="number" value={form.syllables} onChange={(e)=>setForm((f)=>({...f, syllables:Number(e.target.value||1)}))} className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10"/></Field>
        <Field label="Phonemes (comma-separated)"><input value={form.phonemes} onChange={(e)=>setForm((f)=>({...f, phonemes:e.target.value}))} className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10" placeholder="R, AE, B, IH, T"/></Field>
        <Field label="Positions">
          <div className="flex gap-2">
            {(["initial","medial","final"] as const).map((p)=>(
              <button key={p} type="button" onClick={()=>togglePosition(p)} className={`px-3 py-2 rounded-xl ring-1 ring-black/10 text-sm ${form.positions.includes(p) ? "bg-[#FFE7E0] text-[#D94E3A]" : "bg-white"}`}>
                {p}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="flex gap-2">
        <button className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white" onClick={submitWord}>{editIndex === null ? "Add word" : "Save edit"}</button>
        <button className="px-4 py-2 rounded-xl bg-white ring-1 ring-black/10" onClick={clearForm}>Clear</button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-medium">Custom Word Entries</h4>
        <input value={search} onChange={(e)=>setSearch(e.target.value)} className="w-full max-w-[280px] px-3 py-2 rounded-xl ring-1 ring-black/10" placeholder="Search custom words"/>
      </div>

      <div className="rounded-2xl ring-1 ring-black/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-black/60 bg-black/[.02]">
            <tr>
              <th className="p-2">Word</th>
              <th className="p-2">Syllables</th>
              <th className="p-2">Phonemes</th>
              <th className="p-2">Positions</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((w) => {
              const sourceIndex = words.findIndex((x) => x.word === w.word && x.syllable_count === w.syllable_count);
              return (
                <tr key={`${w.word}-${w.syllable_count}`} className="border-t border-black/10">
                  <td className="p-2 font-medium">{w.word}</td>
                  <td className="p-2">{w.syllable_count}</td>
                  <td className="p-2">{w.phonemes.join(", ")}</td>
                  <td className="p-2">{Object.values(w.positions)[0]?.join(", ") ?? "—"}</td>
                  <td className="p-2 text-right">
                    <div className="inline-flex gap-2">
                      <button className="px-3 py-1.5 rounded-lg bg-black/5" onClick={()=>loadForEdit(w, sourceIndex)}>Edit</button>
                      <button className="px-3 py-1.5 rounded-lg bg-rose-600 text-white" onClick={()=>removeWord(sourceIndex)}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr><td className="p-3 text-black/60" colSpan={5}>No custom words yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Group({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="rounded-2xl bg-white ring-1 ring-black/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-4 md:p-5">
      <h3 className="text-lg font-medium">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-black/60">{label}</span>
      {children}
    </label>
  );
}

function Select({ options }: { options: string[] }) {
  return (
    <div className="relative">
      <select className="w-full appearance-none bg-white px-3 py-2 rounded-xl ring-1 ring-black/10 text-black/70">
        {options.map((opt) => (
          <option key={opt}>{opt}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black/40">▾</div>
    </div>
  );
}

function SwitchField({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(!!defaultChecked);
  return (
    <button type="button" onClick={()=>setOn(v=>!v)} className={`flex items-center justify-between px-3 py-2 rounded-xl ring-1 ring-black/10 ${on? "bg-[#FFE7E0]":"bg-white"}`}>
      <span className="text-sm">{label}</span>
      <span className={`inline-flex h-6 w-10 items-center rounded-full ${on? "bg-[#D94E3A]":"bg-black/20"}`}>
        <span className={`h-5 w-5 bg-white rounded-full transition ${on? "translate-x-4":"translate-x-1"}`}></span>
      </span>
    </button>
  );
}

function Checkbox({ defaultChecked }: { defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(!!defaultChecked);
  return (
    <button type="button" onClick={()=>setChecked(v=>!v)} className={`h-5 w-5 rounded-md ring-1 ring-black/10 flex items-center justify-center ${checked? "bg-[#D94E3A] text-white":"bg-white text-black/40"}`}>
      {checked ? "✓" : ""}
    </button>
  );
}

function Badge({ children, tone="stone" }: { children: React.ReactNode; tone?: Tone }) {
  const tones: Record<Tone,string> = {
    stone: "bg-stone-100 text-stone-700 ring-stone-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ring-1 ${tones[tone]}`}>{children}</span>;
}

function ApiKey() {
  const [key, setKey] = useState("sk_live_51J...eH3");
  function regenerate() {
    setKey("sk_live_" + Math.random().toString(36).slice(2,10) + "..." + Math.random().toString(36).slice(2,5));
  }
  return (
    <div className="flex items-center gap-2">
      <input readOnly className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10" value={key}/>
      <button className="px-3 py-2 rounded-xl bg-white ring-1 ring-black/10" onClick={regenerate}>Regenerate</button>
    </div>
  );
}

function Tile({ title, metric, sub }: { title: string; metric: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-black/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-4">
      <div className="text-sm text-black/60">{title}</div>
      <div className="text-2xl font-semibold mt-1">{metric}</div>
      {sub ? <div className="text-xs text-black/50 mt-1">{sub}</div> : null}
    </div>
  );
}

function IntegrationRow({ name, status, action }: { name: string; status: "Connected" | "Not connected"; action: "Manage" | "Connect" }) {
  const tone: Tone = status === "Connected" ? "emerald" : "stone";
  return (
    <div className="flex items-center justify-between rounded-2xl ring-1 ring-black/10 p-3 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] mb-2">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-xl bg-black/5 flex items-center justify-center">🔗</div>
        <div>
          <div className="text-sm font-medium">{name}</div>
          <div className="text-xs text-black/60">Status: <Badge tone={tone}>{status}</Badge></div>
        </div>
      </div>
      <button className={`px-3 py-2 rounded-xl ${action === "Manage" ? "bg-white ring-1 ring-black/10" : "bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white"}`}>{action}</button>
    </div>
  );
}

const roles = [
  { role: "SLP", perms: [true, true, true, false, false] },
  { role: "Assistant", perms: [true, true, false, false, false] },
  { role: "Clinic Admin", perms: [true, true, true, true, true] },
];

function slug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g,"-"); }
