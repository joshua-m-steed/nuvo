"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../lib/authClient";
import {
  assignments as assignmentsApi,
  students as studentsApi,
} from "../../../lib/api";
import type { HomeworkAssignment, Student } from "../../../lib/types";
import { CSVData } from "../../../lib/CSVData";
import { CsvService } from "../service/model/CsvService";
import { PdfService } from "../service/model/PdfService";
import { DemoDataService } from "../service/model/DemoDataService";

type Scope = "all" | "individual";
type ActiveTab = "preview" | "generated";

type Row = {
  name: string;
  recipient: string;
  phoneme: string;
  period: string;
  created: string;
  status: "Draft" | "Ready" | "Sent";
};

type CsvRow = {
  date: string;
  phoneme: string;
  attempts: number;
  correct: number;
  accuracy: string;
  minutes: number;
  game: string;
};

export default function ReportsPage() {
  const { user } = useAuth();

  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [scope, setScope] = useState<Scope>("all");
  const [studentQuery, setStudentQuery] = useState("");
  const [phoneme, setPhoneme] = useState("Any");

  const [openFile, setOpenFile] = useState(false);
  const [openedFileName, setOpenedFileName] = useState("");

  const [activeTab, setActiveTab] = useState<ActiveTab>("preview");

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  const csvService = new CsvService();
  const pdfService = new PdfService();
  const demoDataService = new DemoDataService();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [a, s] = await Promise.all([
        assignmentsApi.list(user),
        studentsApi.list(user),
      ]);
      setAssignments(a);
      setStudents(s);
    })();
  }, [user]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = exportRef.current;
      if (!el) return;
      if (exportOpen && !el.contains(e.target as Node)) setExportOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [exportOpen]);

  const studentsById = useMemo(() => {
    return new Map(students.map((s) => [s.id, s]));
  }, [students]);

  const matchedStudentIds = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return new Set(students.map((s) => s.id));
    const ids = students
      .filter((s) => s.name.toLowerCase().includes(q))
      .map((s) => s.id);
    return new Set(ids);
  }, [studentQuery, students]);

  const phonemeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const a of assignments) {
      set.add(formatPhoneme(a.targets?.phoneme));
    }
    for (const s of students) {
      for (const t of s.targets ?? []) {
        set.add(formatPhoneme(t.phoneme));
      }
      for (const g of s.goals ?? []) {
        set.add(formatPhoneme(g.phoneme));
      }
    }
    const values = Array.from(set)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    return ["Any", ...values];
  }, [assignments, students]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (scope === "individual" && !matchedStudentIds.has(a.student_id))
        return false;
      if (phoneme !== "Any" && formatPhoneme(a.targets?.phoneme) !== phoneme)
        return false;
      return true;
    });
  }, [assignments, scope, matchedStudentIds, phoneme]);

  const subtitle = useMemo(() => {
    const who =
      scope === "all"
        ? "All Students"
        : studentQuery.trim()
        ? studentQuery.trim()
        : "Individual";
    return `Phoneme • ${phoneme} • ${who}`;
  }, [scope, studentQuery, phoneme]);

  const rows = useMemo(
    () => buildRows(filteredAssignments, studentsById),
    [filteredAssignments, studentsById]
  );
  const csvRows = useMemo(
    () => buildCsvRows(filteredAssignments),
    [filteredAssignments]
  );

  const accuracyPct = useMemo(() => {
    if (!filteredAssignments.length) return 0;
    const sum = filteredAssignments.reduce(
      (acc, a) => acc + statusScore(a.status),
      0
    );
    return Math.round((sum / filteredAssignments.length) * 100);
  }, [filteredAssignments]);

  const totalMinutes = useMemo(() => {
    return filteredAssignments.reduce((acc, a) => {
      const itemCount = a.items?.length ?? a.settings?.item_count ?? 0;
      const reps = a.settings?.reps ?? 1;
      return acc + Math.max(1, Math.round((itemCount * reps) / 3));
    }, 0);
  }, [filteredAssignments]);

  const streakDays = useMemo(() => {
    if (!students.length) return 0;
    const now = Date.now();
    const active = students
      .map((s) =>
        s.last_activity_at
          ? Math.floor(
              (now - new Date(s.last_activity_at).getTime()) / 86400000
            )
          : 30
      )
      .filter((days) => Number.isFinite(days));
    if (!active.length) return 0;
    const avgDaysAgo = active.reduce((a, b) => a + b, 0) / active.length;
    return Math.max(1, Math.min(14, Math.round(10 - avgDaysAgo / 2)));
  }, [students]);

  const activeFilters = useMemo(() => {
    const chips: string[] = [];
    chips.push(scope === "all" ? "All Students" : "Individual");
    if (scope === "individual" && studentQuery.trim())
      chips.push(`Student: ${studentQuery.trim()}`);
    if (phoneme !== "Any") chips.push(`Phoneme: ${phoneme}`);
    return chips;
  }, [scope, studentQuery, phoneme]);

  const exportCsv = async (name: string) => {
    let csvDataSet: CSVData[] = [];
    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];

      const csvData = new CSVData(
        name,
        row.date,
        row.phoneme,
        row.attempts,
        row.correct,
        row.accuracy,
        row.minutes,
        row.game
      );

      csvDataSet = [...csvDataSet, csvData];
    }
    await csvService.saveFile(csvDataSet);
  };

  const exportPdf = async (name: string) => {
    let csvDataSet: CSVData[] = [];
    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];

      const csvData = new CSVData(
        name,
        row.date,
        row.phoneme,
        row.attempts,
        row.correct,
        row.accuracy,
        row.minutes,
        row.game
      );

      csvDataSet = [...csvDataSet, csvData];
    }
    await pdfService.saveFile(csvDataSet);
  };

  const exportPreloadCsv = async (
    name: string,
    date: string,
    phoneme: string
  ) => {
    let csvDataSet: CSVData[] = [];
    const parsed_name = name.split(" - ");

    for (let i = 0; i < demoDataService.getDEMORandomInt(1, 50); i++) {
      const dummyAccuracy = `${demoDataService.getDEMORandomInt(0, 100)}%`;

      const gameList = ["DJ Dino", "Safari Jeep", "Fishing Dock"];

      const csvData = new CSVData(
        parsed_name[1],
        date,
        phoneme,
        demoDataService.getDEMORandomInt(1, 5),
        demoDataService.getDEMORandomInt(1, 50),
        dummyAccuracy,
        demoDataService.getDEMORandomInt(1, 5200),
        gameList[demoDataService.getDEMORandomInt(0, 3)]
      );

      csvDataSet = [...csvDataSet, csvData];
    }
    await csvService.saveFile(csvDataSet);
  };

  const exportPreloadPdf = async (
    name: string,
    date: string,
    phoneme: string
  ) => {
    let csvDataSet: CSVData[] = [];
    const parsed_name = name.split(" - ");

    for (let i = 0; i < demoDataService.getDEMORandomInt(10, 500); i++) {
      const dummyAccuracy = `${demoDataService.getDEMORandomInt(0, 100)}%`;

      const gameList = ["DJ Dino", "Safari Jeep", "Fishing Dock"];

      const csvData = new CSVData(
        parsed_name[1],
        date,
        phoneme,
        demoDataService.getDEMORandomInt(1, 5),
        demoDataService.getDEMORandomInt(1, 50),
        dummyAccuracy,
        demoDataService.getDEMORandomInt(1, 5200),
        gameList[demoDataService.getDEMORandomInt(0, 3)]
      );

      csvDataSet = [...csvDataSet, csvData];
    }
    await pdfService.saveFile(csvDataSet);
  };

  return (
    <div className="text-[#161616] space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-black/60 mt-1">
            Generate simple, parent-friendly or IEP-ready reports-fast.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl ring-1 ring-black/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-2 text-sm ${
                activeTab === "preview"
                  ? "bg-[#FFE7E0] text-[#D94E3A] font-medium"
                  : "bg-white text-black/70"
              }`}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("generated")}
              className={`px-3 py-2 text-sm ${
                activeTab === "generated"
                  ? "bg-[#FFE7E0] text-[#D94E3A] font-medium"
                  : "bg-white text-black/70"
              }`}
            >
              Generated Reports
            </button>
          </div>

          <button className="px-4 py-2 rounded-xl bg-white ring-1 ring-black/10 shadow-sm hover:-translate-y-0.5 transition">
            Save View
          </button>

          <div className="relative" ref={exportRef}>
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white shadow hover:-translate-y-0.5 transition inline-flex items-center gap-2"
              onClick={() => setExportOpen((v) => !v)}
            >
              Export
              <span className="text-white/90">▾</span>
            </button>

            {exportOpen ? (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white ring-1 ring-black/10 shadow-[0_20px_60px_rgba(0,0,0,0.18)] overflow-hidden z-20">
                <button
                  className="w-full text-left px-4 py-3 text-sm hover:bg-black/[.03]"
                  onClick={async () => {
                    await exportCsv(studentQuery);
                  }}
                >
                  Export as CSV
                </button>
                <button
                  className="w-full text-left px-4 py-3 text-sm hover:bg-black/[.03]"
                  onClick={async () => {
                    await exportPdf(studentQuery);
                  }}
                >
                  Export as PDF
                </button>
                <button className="w-full text-left px-4 py-3 text-sm hover:bg-black/[.03]">
                  Share
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <section className="rounded-2xl bg-white ring-1 ring-black/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-4 md:p-5">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 flex-1">
            <Filter label="Scope">
              <div className="inline-flex rounded-xl ring-1 ring-black/10 overflow-hidden">
                <button
                  className={`px-3 py-2 text-sm ${
                    scope === "all"
                      ? "bg-[#FFE7E0] text-[#D94E3A] font-medium"
                      : "bg-white text-black/70"
                  }`}
                  onClick={() => {
                    setScope("all");
                    setStudentQuery("");
                  }}
                  type="button"
                >
                  All Students
                </button>
                <button
                  className={`px-3 py-2 text-sm ${
                    scope === "individual"
                      ? "bg-[#FFE7E0] text-[#D94E3A] font-medium"
                      : "bg-white text-black/70"
                  }`}
                  onClick={() => setScope("individual")}
                  type="button"
                >
                  Individual
                </button>
              </div>
            </Filter>

            {scope === "individual" ? (
              <Filter label="Student">
                <input
                  className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10"
                  placeholder="Search by name"
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                />
              </Filter>
            ) : (
              <div className="hidden md:block" />
            )}

            <Filter label="Phoneme">
              <div className="relative">
                <select
                  value={phoneme}
                  onChange={(e) => setPhoneme(e.target.value)}
                  className="w-full appearance-none bg-white px-3 py-2 rounded-xl ring-1 ring-black/10 text-black/70"
                >
                  {phonemeOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-black/40">
                  ▾
                </div>
              </div>
            </Filter>

            <Filter label="Date Range">
              <div className="flex gap-2">
                <input
                  className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10"
                  placeholder="Start"
                />
                <input
                  className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10"
                  placeholder="End"
                />
              </div>
            </Filter>
          </div>

          <div className="flex items-center gap-2 justify-between lg:justify-end">
            <button
              className="px-4 py-2 rounded-xl bg-white ring-1 ring-black/10 hover:bg-black/[.02]"
              onClick={() => setShowAdvancedFilters(true)}
            >
              More filters
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-black/5"
              onClick={() => {
                setScope("all");
                setStudentQuery("");
                setPhoneme("Any");
              }}
            >
              Reset
            </button>
            <button className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white">
              Apply
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs text-black/50">Active filters:</span>
          {activeFilters.length ? (
            activeFilters.map((chip) => (
              <span
                key={chip}
                className="text-xs px-2 py-1 rounded-lg bg-white ring-1 ring-black/10 text-black/70"
              >
                {chip}
              </span>
            ))
          ) : (
            <span className="text-xs px-2 py-1 rounded-lg bg-white ring-1 ring-black/10 text-black/70">
              None
            </span>
          )}
        </div>
      </section>

      {showAdvancedFilters ? (
        <Modal
          title="More Filters"
          onClose={() => setShowAdvancedFilters(false)}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Filter label="Clinic / Location">
              <Select placeholder="All Clinics" />
            </Filter>
            <Filter label="Assigned SLP">
              <Select placeholder="Any" />
            </Filter>
            <Filter label="Session Type">
              <Select placeholder="Clinic • School • Telehealth" />
            </Filter>
            <Filter label="Game / Activity">
              <Select placeholder="Any activity" />
            </Filter>
            <Filter label="Goal">
              <Select placeholder="Select goal" />
            </Filter>
            <Filter label="Target Sound / Position">
              <Select placeholder="/r/ initial • /s/ final" />
            </Filter>
            <Filter label="Cue Level">
              <Select placeholder="None • Visual • Verbal" />
            </Filter>
            <Filter label="Accuracy Threshold">
              <input
                className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10"
                placeholder=">= 70%"
              />
            </Filter>
            <Filter label="Minutes Practiced">
              <input
                className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10"
                placeholder=">= 60 min/week"
              />
            </Filter>
            <Filter label="Compliance Tags">
              <Select placeholder="IEP • Consent • HIPAA" />
            </Filter>
            <Filter label="Status">
              <Select placeholder="All (draft, ready, sent)" />
            </Filter>
            <Filter label="Sort">
              <Select placeholder="Newest first" />
            </Filter>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="px-4 py-2 rounded-xl bg-black/5"
              onClick={() => setShowAdvancedFilters(false)}
            >
              Done
            </button>
          </div>
        </Modal>
      ) : null}

      {activeTab === "preview" ? (
        <section className="rounded-2xl bg-white ring-1 ring-black/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-4 md:p-5">
          <div>
            <h2 className="text-lg font-medium">Report Preview</h2>
            <div className="text-sm text-black/60 mt-1">{subtitle}</div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Stat
              label="Accuracy"
              value={`${accuracyPct}%`}
              caption="from assignments"
            />
            <Stat
              label="Practice"
              value={`${totalMinutes}m`}
              caption="from selected data"
            />
            <Stat
              label="Streak"
              value={`${streakDays} days`}
              caption="estimated from activity"
            />
          </div>

          <div className="mt-4 rounded-xl ring-1 ring-black/10 p-3">
            <div className="text-sm font-medium">Summary (plain language)</div>
            <p className="mt-2 text-sm text-black/70 leading-relaxed">
              Students showed {accuracyPct >= 75 ? "strong" : "developing"}{" "}
              performance on selected targets. This preview is generated from
              local demo assignments and target usage. Use this as a
              parent-ready summary, then export or customize details by date
              range and phoneme.
            </p>
          </div>

          <div className="mt-4 rounded-xl ring-1 ring-black/10 p-3">
            <div className="text-sm font-medium">Accuracy (30 days)</div>
            <div className="mt-3 h-28 rounded-lg bg-gradient-to-r from-black/5 to-black/10" />

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-black/60">
                  <tr className="border-b border-black/10">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Phoneme</th>
                    <th className="py-2 pr-3">Attempts</th>
                    <th className="py-2 pr-3">Correct</th>
                    <th className="py-2 pr-3">Accuracy</th>
                    <th className="py-2 pr-3">Minutes</th>
                    <th className="py-2 pr-3">Game</th>
                  </tr>
                </thead>
                <tbody>
                  {csvRows.map((r) => (
                    <tr
                      key={`${r.date}-${r.game}-${r.phoneme}`}
                      className="border-b border-black/5"
                    >
                      <td className="py-2 pr-3">{r.date}</td>
                      <td className="py-2 pr-3">{r.phoneme}</td>
                      <td className="py-2 pr-3">{r.attempts}</td>
                      <td className="py-2 pr-3">{r.correct}</td>
                      <td className="py-2 pr-3">{r.accuracy}</td>
                      <td className="py-2 pr-3">{r.minutes}</td>
                      <td className="py-2 pr-3">{r.game}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-2 text-xs text-black/50">
              These rows mirror what would be included in the CSV export.
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-white ring-1 ring-black/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <div className="p-4 border-b border-black/10 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Generated Reports</h2>
              <div className="text-sm text-black/60">
                Saved reports you can reopen, resend, or export.
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <button
                className="px-3 py-2 rounded-xl bg-black/5"
                onClick={() => setScheduleOpen(true)}
              >
                Schedule
              </button>
              <button className="px-3 py-2 rounded-xl bg-white ring-1 ring-black/10">
                Bulk Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-black/60">
                <tr className="border-b border-black/10">
                  <th className="p-3">Name</th>
                  <th className="p-3">Recipient</th>
                  <th className="p-3">Phoneme</th>
                  <th className="p-3">Period</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={`${r.name}-${i}`}
                    className="border-b border-black/5 hover:bg-black/[.02]"
                  >
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3">{r.recipient}</td>
                    <td className="p-3">{r.phoneme}</td>
                    <td className="p-3">{r.period}</td>
                    <td className="p-3">{r.created}</td>
                    <td className="p-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          className="px-3 py-1.5 rounded-lg bg-black/5"
                          onClick={() => {
                            setOpenFile(true);
                            setOpenedFileName(
                              r.name === undefined || r.name === ""
                                ? "All Students"
                                : r.name
                            );
                          }}
                        >
                          Open
                        </button>
                        <button
                          className="px-3 py-1.5 rounded-lg bg-white ring-1 ring-black/10"
                          onClick={async () => {
                            await exportPreloadPdf(
                              r.name,
                              r.created,
                              r.phoneme
                            );
                          }}
                        >
                          PDF
                        </button>
                        <button
                          className="px-3 py-1.5 rounded-lg bg-white ring-1 ring-black/10"
                          onClick={async () => {
                            await exportPreloadCsv(
                              r.name,
                              r.created,
                              r.phoneme
                            );
                          }}
                        >
                          CSV
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 flex items-center justify-between text-sm text-black/60">
            <span>
              Showing 1-{rows.length} of {rows.length}
            </span>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 rounded-lg bg-black/5">
                Prev
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-black/5">
                Next
              </button>
            </div>
          </div>
        </section>
      )}

      {scheduleOpen ? (
        <Modal title="Schedule Exports" onClose={() => setScheduleOpen(false)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Filter label="Format">
              <Select placeholder="CSV • PDF" />
            </Filter>
            <Filter label="Scope">
              <Select placeholder="All Students" />
            </Filter>
            <Filter label="Frequency">
              <Select placeholder="Monthly • Quarterly" />
            </Filter>
            <Filter label="Delivery">
              <Select placeholder="Email • Secure Link" />
            </Filter>
            <Filter label="Recipients">
              <input
                className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10"
                placeholder="Parent, Admin"
              />
            </Filter>
            <Filter label="Start Date">
              <input
                className="w-full px-3 py-2 rounded-xl ring-1 ring-black/10"
                placeholder="YYYY-MM-DD"
              />
            </Filter>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="px-4 py-2 rounded-xl bg-black/5"
              onClick={() => setScheduleOpen(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white"
              onClick={() => setScheduleOpen(false)}
            >
              Save Schedule
            </button>
          </div>
        </Modal>
      ) : null}

      {openFile ? (
        <Modal
          title={`${openedFileName}`}
          onClose={() => {
            setOpenFile(false);
            setOpenedFileName("");
          }}
        >
          <div className="flex flex-col max-h-[90vh]">
            <div className="flex-1 overflow-auto">
              <div className="flex justify-center p-6">
                <div className="w-full max-w-5xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-black/60">
                      <tr className="border-b border-black/10">
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2 pr-3">Phoneme</th>
                        <th className="py-2 pr-3">Attempts</th>
                        <th className="py-2 pr-3">Correct</th>
                        <th className="py-2 pr-3">Accuracy</th>
                        <th className="py-2 pr-3">Minutes</th>
                        <th className="py-2 pr-3">Game</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.map((r) => (
                        <tr
                          key={`${r.date}-${r.game}-${r.phoneme}`}
                          className="border-b border-black/5"
                        >
                          <td className="py-2 pr-3">{r.date}</td>
                          <td className="py-2 pr-3">{r.phoneme}</td>
                          <td className="py-2 pr-3">{r.attempts}</td>
                          <td className="py-2 pr-3">{r.correct}</td>
                          <td className="py-2 pr-3">{r.accuracy}</td>
                          <td className="py-2 pr-3">{r.minutes}</td>
                          <td className="py-2 pr-3">{r.game}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

{
  /* <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    className="px-4 py-2 rounded-xl bg-black/5"
                    onClick={() => setOpenFile(false)}
                  >
                    Cancel
                  </button> */
}
{
  /* <button
                className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#E45B3E] to-[#D94E3A] text-white"
                onClick={saveEdit}
              >
                Save
              </button> */
}
{
  /* </div> */
}
{
  /* </div> */
}

function formatPhoneme(input?: string) {
  const value = (input ?? "").trim();
  if (!value) return "";
  if (value.toLowerCase() === "blends") return "Blends";
  if (value.startsWith("/") && value.endsWith("/")) return value;
  return `/${value.toLowerCase()}/`;
}

function statusScore(status: HomeworkAssignment["status"]) {
  if (status === "completed") return 0.9;
  if (status === "in_progress") return 0.7;
  if (status === "assigned") return 0.55;
  return 0.35;
}

function buildRows(
  assignments: HomeworkAssignment[],
  studentsById: Map<string, Student>
): Row[] {
  return assignments.slice(0, 42).map((a) => {
    const student = studentsById.get(a.student_id);
    const status: Row["status"] =
      a.status === "completed"
        ? "Sent"
        : a.status === "draft"
        ? "Draft"
        : "Ready";
    return {
      name: `Progress Report - ${student?.name ?? "Student"}`,
      recipient: "Parent",
      phoneme: formatPhoneme(a.targets?.phoneme) || "Any",
      period: `${formatDate(a.created_at)}-${formatDate(a.due_date)}`,
      created: formatDate(a.created_at),
      status,
    };
  });
}

function buildCsvRows(assignments: HomeworkAssignment[]): CsvRow[] {
  return assignments.slice(0, 12).map((a) => {
    const attempts =
      (a.items?.length ?? a.settings?.item_count ?? 0) *
      (a.settings?.reps ?? 1);
    const correct = Math.max(0, Math.round(attempts * statusScore(a.status)));
    const accuracy =
      attempts > 0 ? `${Math.round((correct / attempts) * 100)}%` : "0%";
    const minutes = Math.max(1, Math.round(attempts / 4));
    const game = friendlyGameName(a.items?.[0]?.minigame_id);

    return {
      date: formatDate(a.created_at),
      phoneme: formatPhoneme(a.targets?.phoneme) || "Any",
      attempts,
      correct,
      accuracy,
      minutes,
      game,
    };
  });
}

function formatDate(value?: string) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function friendlyGameName(gameId?: string) {
  if (!gameId) return "-";
  if (gameId === "dj_dino") return "DJ Dino";
  if (gameId === "fish_bobber") return "Fishing Dock";
  if (gameId === "safari_jeep") return "Safari Jeep";
  return gameId;
}

function Filter({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-black/60">{label}</span>
      {children}
    </label>
  );
}

function Select({ placeholder }: { placeholder: string }) {
  return (
    <button className="w-full text-left px-3 py-2 rounded-xl bg-white ring-1 ring-black/10 hover:bg-black/[.03]">
      <span className="text-black/70">{placeholder}</span>
    </button>
  );
}

function Stat({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div className="rounded-xl ring-1 ring-black/10 p-3 text-center">
      <div className="text-xs text-black/60">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {caption ? <div className="text-xs text-black/50">{caption}</div> : null}
    </div>
  );
}

function StatusPill({ status }: { status: Row["status"] }) {
  const cls =
    status === "Sent"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "Draft"
      ? "bg-stone-100 text-stone-700 ring-stone-200"
      : "bg-orange-50 text-orange-700 ring-orange-200";
  return (
    <span className={`px-2 py-1 rounded-lg text-xs ring-1 ${cls}`}>
      {status}
    </span>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-5 ring-1 ring-black/10 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            className="px-3 py-1.5 rounded-lg bg-black/5"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
