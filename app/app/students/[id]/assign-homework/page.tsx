"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { useAuth } from "../../../../../lib/authClient";
import {
  students as studentsApi,
  assignments as assignmentsApi,
  exemplars as exemplarsApi,
} from "../../../../../lib/api";
import { loadWordBank, filterWordBank, uniquePhonemes } from "../../../../../lib/wordbank";
import { createId } from "../../../../../lib/mockDb";
import type { HomeworkAssignment, HomeworkItem } from "../../../../../lib/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Select,
  Textarea,
} from "../../../../../components/ui";
import { useToast } from "../../../../../components/toast";

const games = [
  { id: "fish_bobber", name: "Fishing" },
  { id: "dj_dino", name: "DJ Dino" },
  { id: "safari_jeep", name: "Safari Jeep" },
];

function StepPill({ active }: { active: boolean }) {
  return (
    <div
      className={`h-2 w-8 rounded-full ${
        active ? "bg-nuvo-600" : "bg-ink-200"
      }`}
    />
  );
}

type Position = "initial" | "medial" | "final";
type PhonemeTab = "single_consonants" | "blends";
type PhonemePlan = { position: Position; itemCount: number; reps: number };

const VOWEL_PHONEMES = new Set([
  "aa",
  "ae",
  "ah",
  "ao",
  "aw",
  "ay",
  "eh",
  "er",
  "ey",
  "ih",
  "iy",
  "ow",
  "oy",
  "uh",
  "uw",
  "a",
  "e",
  "i",
  "o",
  "u",
  "ə",
  "ɚ",
  "ɝ",
  "ɪ",
  "ɛ",
  "æ",
  "ʌ",
  "ɑ",
  "ɒ",
  "ɔ",
  "ʊ",
  "ɨ",
  "ɜ",
  "ɐ",
  "aɪ",
  "aʊ",
  "eɪ",
  "oʊ",
  "ɔɪ",
]);

const DEFAULT_PLAN: PhonemePlan = { position: "initial", itemCount: 10, reps: 3 };
const CUSTOM_WORDS_KEY = "nuvo_custom_words_v1";

function canonicalPhoneme(phoneme: string) {
  return String(phoneme || "").trim().replace(/\//g, "").toLowerCase();
}

function displayPhoneme(phoneme: string) {
  const raw = String(phoneme || "").trim();
  if (!raw) return "—";
  if (raw.startsWith("/") && raw.endsWith("/")) return raw;
  return `/${raw}/`;
}

function isVowelPhoneme(phoneme: string) {
  return VOWEL_PHONEMES.has(canonicalPhoneme(phoneme));
}

function isBlendPhoneme(phoneme: string) {
  const core = canonicalPhoneme(phoneme).replace(/[ˈˌ]/g, "");
  return !isVowelPhoneme(phoneme) && core.length > 1;
}

function findMatchingPhoneme(available: string[], target?: string) {
  if (!target) return undefined;
  const key = canonicalPhoneme(target);
  return available.find((p) => canonicalPhoneme(p) === key);
}

function getPhonemeTab(phoneme: string): PhonemeTab {
  if (isBlendPhoneme(phoneme)) return "blends";
  return "single_consonants";
}

export default function AssignHomework() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { push } = useToast();

  const [student, setStudent] = React.useState<any>(null);
  const [loadError, setLoadError] = React.useState<string>("");

  const [step, setStep] = React.useState(1);

  // Step 1: goal
  const [selectedPhonemes, setSelectedPhonemes] = React.useState<string[]>([]);
  const [phonemePlans, setPhonemePlans] = React.useState<Record<string, PhonemePlan>>({});
  const [phonemeTab, setPhonemeTab] = React.useState<PhonemeTab>("single_consonants");

  // Step 3: words
  const [wordBank, setWordBank] = React.useState<any[]>([]);
  const [wordPoolCount, setWordPoolCount] = React.useState(0);
  const [items, setItems] = React.useState<
    Array<{ word: string; syllables: number; phoneme: string; position: Position; reps: number }>
  >([]);
  const [selectedSyllables, setSelectedSyllables] = React.useState<number[]>([1, 2, 3, 4]);
  const [warning, setWarning] = React.useState<string>("");
  const [editingItem, setEditingItem] = React.useState<{
    word: string;
    phoneme: string;
    position: Position;
  } | null>(null);
  const [editWordInput, setEditWordInput] = React.useState("");
  const [showAddWordModal, setShowAddWordModal] = React.useState(false);
  const [newWordText, setNewWordText] = React.useState("");
  const [newWordSyllables, setNewWordSyllables] = React.useState(1);
  const [newWordPhonemes, setNewWordPhonemes] = React.useState<string[]>([]);
  const [newWordPositions, setNewWordPositions] = React.useState<Record<string, Position[]>>({});

  // Step 4: exemplars/settings
  const [playBefore, setPlayBefore] = React.useState(true);
  const [allowReplay, setAllowReplay] = React.useState(true);
  const [requireReplay, setRequireReplay] = React.useState(false);
  const [globalExUrl, setGlobalExUrl] = React.useState<string>("");
  const [globalExId, setGlobalExId] = React.useState<string>("");

  // per-item exemplar (id + preview URL in session)
  const [perItemEx, setPerItemEx] = React.useState<
    Record<string, { id: string; url: string }>
  >({});

  // Step 5: game
  const [gameId, setGameId] = React.useState(games[0].id);

  // Step 6: schedule + note
  const [dueDate, setDueDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [daysPerWeek, setDaysPerWeek] = React.useState(4);
  const [parentNote, setParentNote] = React.useState(
    "Hi! Please practice this short Nuvo game 4 days this week. Keep it light and celebrate effort."
  );

  // Initial load: student + word bank + recommended defaults
  React.useEffect(() => {
    if (isLoading || !user?.id) return;

    (async () => {
      try {
        setLoadError("");
        const s = await studentsApi.get(user, id);
        setStudent(s);

        const wb = await loadWordBank();
        let merged = [...wb];
        try {
          const raw = localStorage.getItem(CUSTOM_WORDS_KEY);
          const saved = raw ? JSON.parse(raw) : [];
          if (Array.isArray(saved) && saved.length) {
            const seen = new Set(merged.map((x: any) => String(x.word).toLowerCase()));
            for (const item of saved) {
              const w = String(item?.word || "").toLowerCase();
              if (!w || seen.has(w)) continue;
              merged.push(item);
              seen.add(w);
            }
          }
        } catch {
          // ignore custom-word parse failures
        }
        setWordBank(merged);
        const wbPhonemes = uniquePhonemes(merged).map((p) => String(p));
        const firstSelectable = wbPhonemes.find((p) => !isVowelPhoneme(p)) ?? wbPhonemes[0] ?? "ə";

        const rec = s?.targets?.[0];
        if (rec) {
          const recommended = findMatchingPhoneme(wbPhonemes, String(rec.phoneme || ""));
          const chosen = !recommended || isVowelPhoneme(recommended) ? firstSelectable : recommended;
          setSelectedPhonemes([chosen]);
          setPhonemePlans({
            [chosen]: { ...DEFAULT_PLAN, position: (rec.position as Position) || "initial" },
          });
          setPhonemeTab(getPhonemeTab(chosen));
        } else {
          setSelectedPhonemes([firstSelectable]);
          setPhonemePlans({ [firstSelectable]: { ...DEFAULT_PLAN } });
          setPhonemeTab(getPhonemeTab(firstSelectable));
        }
      } catch (err: any) {
        setLoadError(err?.message ?? "Failed to load student.");
        push({
          tone: "error",
          title: "Couldn’t load assign wizard",
          message: err?.message ?? "Please try again.",
        });
      }
    })();
  }, [isLoading, user, id, push]);

  // Generate words whenever goal/constraints change
  const availablePhonemes = React.useMemo(() => uniquePhonemes(wordBank).map((p) => String(p)), [wordBank]);

  const phonemesByTab = React.useMemo(() => {
    const consonantsOnly = availablePhonemes.filter((p) => !isVowelPhoneme(p));
    const blends = consonantsOnly.filter((p) => isBlendPhoneme(p));
    const singleConsonants = availablePhonemes.filter(
      (p) => !isVowelPhoneme(p) && !isBlendPhoneme(p)
    );
    return {
      blends,
      single_consonants: singleConsonants,
    };
  }, [availablePhonemes]);

  function getSyllableFilter() {
    return selectedSyllables.length ? selectedSyllables : undefined;
  }

  function getPlan(phoneme: string): PhonemePlan {
    return phonemePlans[phoneme] ?? DEFAULT_PLAN;
  }

  function getPoolForPhoneme(phoneme: string, plan: PhonemePlan) {
    const pool = filterWordBank(wordBank, {
      phoneme,
      position: plan.position,
      syllables: getSyllableFilter(),
    });
    return pool.map((w: any) => ({
      word: w.word,
      syllables: w.syllable_count,
      phoneme,
      position: plan.position,
      reps: plan.reps,
    }));
  }

  function buildItemsFromPlans() {
    const usedWords = new Set<string>();
    const next: Array<{ word: string; syllables: number; phoneme: string; position: Position; reps: number }> = [];
    let poolTotal = 0;

    for (const phoneme of selectedPhonemes) {
      const plan = getPlan(phoneme);
      const pool = getPoolForPhoneme(phoneme, plan);
      poolTotal += pool.length;
      const shuffled = [...pool].sort(() => Math.random() - 0.5);

      let added = 0;
      for (const pick of shuffled) {
        if (usedWords.has(pick.word)) continue;
        usedWords.add(pick.word);
        next.push(pick);
        added += 1;
        if (added >= plan.itemCount) break;
      }
    }

    return { next, poolTotal };
  }

  const desiredItemCount = React.useMemo(
    () =>
      selectedPhonemes.reduce((sum, p) => {
        const plan = getPlan(p);
        return sum + Math.max(0, Number(plan.itemCount) || 0);
      }, 0),
    [selectedPhonemes, phonemePlans]
  );

  const itemsByPhoneme = React.useMemo(() => {
    const grouped: Record<string, typeof items> = {};
    for (const p of selectedPhonemes) grouped[p] = [];
    for (const it of items) {
      if (!grouped[it.phoneme]) grouped[it.phoneme] = [];
      grouped[it.phoneme].push(it);
    }
    return grouped;
  }, [items, selectedPhonemes]);

  React.useEffect(() => {
    if (!selectedPhonemes.length || !wordBank.length) {
      setWordPoolCount(0);
      setItems([]);
      return;
    }

    const { next, poolTotal } = buildItemsFromPlans();
    setWordPoolCount(poolTotal);
    setItems(next);

    if (poolTotal < desiredItemCount) {
      setWarning(
        `Only ${poolTotal} words match across selected phoneme plans. Try widening syllables or changing per-phoneme positions/counts.`
      );
    } else {
      setWarning("");
    }
  }, [selectedPhonemes, phonemePlans, selectedSyllables, wordBank, desiredItemCount]);

  async function uploadExample(kind: "audio" | "video", forWord?: string) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = kind === "audio" ? "audio/*" : "video/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !user) return;

      const url = URL.createObjectURL(file);

      const created = await exemplarsApi.create({
        created_by_slp_id: user.id,
        scope: forWord ? "per_word" : "global",
        media_type: kind,
        storage_key: `local:${file.name}`,
        duration_ms: undefined,
        label: forWord ? `Example for ${forWord}` : "Global example",
      });

      if (forWord) {
        setPerItemEx((prev) => ({ ...prev, [forWord]: { id: created.id, url } }));
        push({
          tone: "success",
          title: "Example attached",
          message: `Added example for ${forWord}.`,
        });
      } else {
        setGlobalExId(created.id);
        setGlobalExUrl(url);
        push({
          tone: "success",
          title: "Global example added",
          message: "This will play for all words by default.",
        });
      }
    };
    input.click();
  }

  function shuffleWords() {
    const { next } = buildItemsFromPlans();
    setItems(next);
  }

  function removeWord(w: string, phoneme: string, position: Position) {
    setItems((prev) => prev.filter((x) => !(x.word === w && x.phoneme === phoneme && x.position === position)));
  }

  function updatePlan(phoneme: string, patch: Partial<PhonemePlan>) {
    setPhonemePlans((prev) => ({
      ...prev,
      [phoneme]: { ...(prev[phoneme] ?? DEFAULT_PLAN), ...patch },
    }));
  }

  function togglePhoneme(p: string) {
    setSelectedPhonemes((prev) => {
      const exists = prev.includes(p);
      const next = exists ? prev.filter((x) => x !== p) : [...prev, p];
      if (exists) {
        setPhonemePlans((old) => {
          const copy = { ...old };
          delete copy[p];
          return copy;
        });
      } else {
        setPhonemePlans((old) => ({ ...old, [p]: { ...DEFAULT_PLAN } }));
      }
      return next;
    });
  }

  function toggleSyllable(n: number) {
    setSelectedSyllables((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b)
    );
  }

  function openEditWordModal(target: { word: string; phoneme: string; position: Position }) {
    setEditingItem(target);
    setEditWordInput(target.word);
  }

  function openAddWordModal(seedWord: string, target: { phoneme: string; position: Position }) {
    setNewWordText(seedWord);
    setNewWordSyllables(1);
    setNewWordPhonemes([target.phoneme]);
    setNewWordPositions({ [target.phoneme]: [target.position] });
    setShowAddWordModal(true);
  }

  function toggleNewWordPhoneme(phoneme: string) {
    setNewWordPhonemes((prev) => {
      const exists = prev.includes(phoneme);
      const next = exists ? prev.filter((p) => p !== phoneme) : [...prev, phoneme];
      setNewWordPositions((old) => {
        const copy = { ...old };
        if (exists) delete copy[phoneme];
        if (!exists) copy[phoneme] = ["initial"];
        return copy;
      });
      return next;
    });
  }

  function toggleNewWordPosition(phoneme: string, position: Position) {
    setNewWordPositions((prev) => {
      const current = new Set(prev[phoneme] ?? []);
      if (current.has(position)) current.delete(position);
      else current.add(position);
      return { ...prev, [phoneme]: Array.from(current) as Position[] };
    });
  }

  function saveEditedWord() {
    if (!editingItem) return;

    const normalized = editWordInput.trim().toLowerCase();
    if (!normalized) return;

    const candidate = wordBank.find((w: any) => String(w.word).toLowerCase() === normalized);
    if (!candidate) {
      const shouldAdd = window.confirm(
        `"${editWordInput.trim()}" is not in the library. Do you want to add it now?`
      );
      if (shouldAdd) {
        openAddWordModal(editWordInput.trim(), {
          phoneme: editingItem.phoneme,
          position: editingItem.position,
        });
      }
      return;
    }

    const posList = candidate.positions?.[editingItem.phoneme];
    if (!posList || !posList.includes(editingItem.position)) {
      push({
        tone: "error",
        title: "Word does not match target",
        message: `That word is not tagged for ${displayPhoneme(editingItem.phoneme)} in ${editingItem.position} position.`,
      });
      return;
    }

    const duplicate = items.some(
      (x) =>
        !(
          x.word === editingItem.word &&
          x.phoneme === editingItem.phoneme &&
          x.position === editingItem.position
        ) && x.word.toLowerCase() === String(candidate.word).toLowerCase()
    );
    if (duplicate) {
      push({
        tone: "error",
        title: "Word already selected",
        message: "Choose a different word for this item.",
      });
      return;
    }

    setItems((prev) =>
      prev.map((x) =>
        x.word === editingItem.word && x.phoneme === editingItem.phoneme && x.position === editingItem.position
          ? {
              ...x,
              word: candidate.word,
              syllables: candidate.syllable_count,
            }
          : x
      )
    );
    setEditingItem(null);
  }

  function addWordToLibraryFromModal() {
    if (!newWordText.trim()) return;
    if (!newWordPhonemes.length) {
      push({ tone: "error", title: "Add at least one phoneme", message: "Select phoneme tags for the new word." });
      return;
    }

    const positions: Record<string, Position[]> = {};
    for (const p of newWordPhonemes) {
      const list = (newWordPositions[p] ?? []).filter(Boolean);
      if (!list.length) {
        push({
          tone: "error",
          title: "Missing positions",
          message: `Select at least one position for ${displayPhoneme(p)}.`,
        });
        return;
      }
      positions[p] = list;
    }

    const created = {
      word: newWordText.trim().toLowerCase(),
      syllable_count: Number(newWordSyllables) || 1,
      phonemes: [...newWordPhonemes],
      positions,
    };

    setWordBank((prev) => {
      const exists = prev.some((w: any) => String(w.word).toLowerCase() === created.word.toLowerCase());
      const next = exists ? prev : [...prev, created];
      try {
        const raw = localStorage.getItem(CUSTOM_WORDS_KEY);
        const saved = raw ? JSON.parse(raw) : [];
        const merged = Array.isArray(saved) ? saved : [];
        if (!merged.some((w: any) => String(w?.word || "").toLowerCase() === created.word.toLowerCase())) {
          merged.push(created);
          localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(merged));
        }
      } catch {
        // ignore persistence failures
      }
      return next;
    });

    push({ tone: "success", title: "Word added to library", message: `${created.word} is now available.` });
    setShowAddWordModal(false);

    if (editingItem && created.positions?.[editingItem.phoneme]?.includes(editingItem.position)) {
      setItems((prev) =>
        prev.map((x) =>
          x.word === editingItem.word && x.phoneme === editingItem.phoneme && x.position === editingItem.position
            ? { ...x, word: created.word, syllables: created.syllable_count }
            : x
        )
      );
      setEditingItem(null);
    }
  }

  async function finalize(status: "draft" | "assigned") {
    if (!student || !user) return;

    const assignmentItems: HomeworkItem[] = items.map((it) => ({
      item_id: createId("it"),
      prompt_text: it.word,
      target_phoneme: it.phoneme,
      target_position: it.position,
      syllable_count: it.syllables,
      reps: it.reps,
      minigame_id: gameId,
      exemplar_id: perItemEx[it.word]?.id,
    }));

    const firstPlan = selectedPhonemes.length ? getPlan(selectedPhonemes[0]) : DEFAULT_PLAN;
    const maxReps = selectedPhonemes.length
      ? Math.max(...selectedPhonemes.map((p) => getPlan(p).reps))
      : DEFAULT_PLAN.reps;
    const sortedSyllables = [...selectedSyllables].sort((a, b) => a - b);

    const payload: HomeworkAssignment = {
      id: createId("a"),
      student_id: student.id,
      slp_id: user.id,
      clinic_id: user.clinic_id,
      created_at: new Date().toISOString(),
      due_date: dueDate,
      schedule: { days_per_week: daysPerWeek },
      targets: {
        phoneme: selectedPhonemes.join(", "),
        position: firstPlan.position,
        syllable_min: sortedSyllables[0],
        syllable_max: sortedSyllables[sortedSyllables.length - 1],
      },
      items: assignmentItems,
      global_exemplar_id: globalExId || undefined,
      settings: {
        play_exemplar_before_attempt: playBefore,
        allow_replay: allowReplay,
        require_replay: requireReplay,
        item_count: desiredItemCount,
        reps: maxReps,
      },
      status,
      schema_version: "1.0",
      parent_note: parentNote,
    };

    const created = await assignmentsApi.create(payload);
    push({
      tone: "success",
      title: status === "assigned" ? "Homework assigned" : "Draft saved",
      message: "Opening assignment detail…",
    });
    router.push(`/app/homework/${created.id}`);
  }

  if (isLoading || (!student && !loadError)) {
    return (
      <div className="rounded-xl2 border border-ink-200 bg-white p-6 shadow-subtle">
        Loading…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-3 rounded-xl2 border border-ink-200 bg-white p-6 shadow-subtle">
        <div className="text-sm font-semibold text-ink-900">Couldn’t load assign wizard</div>
        <div className="text-sm text-ink-600">{loadError}</div>
        <div>
          <Button variant="secondary" onClick={() => router.push("/app/students")}>
            Back to students
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Assign homework</div>
          <div className="mt-1 text-sm text-ink-600">
            {student.name} • <span className="font-medium">Step {step} of 6</span>
          </div>
        </div>
        <Link
          href={`/app/students/${student.id}`}
          className="text-sm font-medium text-ink-700 hover:text-ink-900"
        >
          Back to profile
        </Link>
      </div>

      <div className="flex gap-2">{[1, 2, 3, 4, 5, 6].map((i) => <StepPill key={i} active={i <= step} />)}</div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="order-2 lg:order-2 lg:sticky lg:top-24 h-fit">
          <Card>
            <CardHeader>
              <div className="text-sm font-semibold">Assignment Summary</div>
              <div className="mt-1 text-xs text-ink-600">What you have selected so far.</div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-ink-700">
              <div>
                <div className="text-xs uppercase tracking-wide text-ink-500">Phoneme plans</div>
                <div className="mt-2 space-y-2">
                  {selectedPhonemes.length ? (
                    selectedPhonemes.map((p) => {
                      const plan = getPlan(p);
                      return (
                        <div key={p} className="rounded-lg border border-ink-200 p-2">
                          <div className="font-semibold text-ink-900">{displayPhoneme(p)}</div>
                          <div className="mt-1 text-xs text-ink-600">
                            {plan.position} • {plan.itemCount} words • {plan.reps} reps
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-ink-500">None</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-ink-500">Word count</div>
                <div className="mt-1 font-medium">{items.length}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-ink-500">Game</div>
                <div className="mt-1 font-medium">{gameId}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-ink-500">Due date</div>
                <div className="mt-1 font-medium">{dueDate}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="order-1 lg:order-1">
          {/* STEP 1 */}
          {step === 1 ? (
            <Card>
              <CardHeader>
                <div className="text-sm font-semibold">1) Select goal</div>
                <div className="mt-1 text-sm text-ink-600">
                  Recommended is preselected from the student’s latest target. You can select more
                  than one phoneme.
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Target phonemes</div>
                  <div className="mt-2 inline-flex rounded-xl2 border border-ink-200 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setPhonemeTab("single_consonants")}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                        phonemeTab === "single_consonants"
                          ? "bg-nuvo-50 text-nuvo-800"
                          : "text-ink-700 hover:bg-ink-50"
                      }`}
                    >
                      Single Consonants
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhonemeTab("blends")}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                        phonemeTab === "blends"
                          ? "bg-nuvo-50 text-nuvo-800"
                          : "text-ink-700 hover:bg-ink-50"
                      }`}
                    >
                      Blends
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-4 md:grid-cols-6">
                    {phonemesByTab[phonemeTab].map((p) => {
                      const selected = selectedPhonemes.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => togglePhoneme(p)}
                          className={`rounded-xl2 border px-3 py-2 text-sm font-semibold transition ${
                            selected
                              ? "border-nuvo-300 bg-nuvo-50 text-nuvo-800"
                              : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
                          }`}
                        >
                          {displayPhoneme(p)}
                        </button>
                      );
                    })}
                  </div>

                  {phonemesByTab[phonemeTab].length === 0 ? (
                    <div className="mt-3 text-sm text-ink-600">No phonemes available in this group.</div>
                  ) : null}
                </div>

                <div className="flex items-end justify-end gap-2">
                  <Button variant="secondary" onClick={() => router.push(`/app/students/${student.id}`)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setStep(2)} disabled={selectedPhonemes.length === 0}>
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

      {/* STEP 2 */}
      {step === 2 ? (
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold">2) Configure each phoneme</div>
            <div className="mt-1 text-sm text-ink-600">
              Set position, number of words, and reps for each selected phoneme.
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {selectedPhonemes.map((phoneme) => {
                const plan = getPlan(phoneme);
                return (
                  <div key={phoneme} className="rounded-xl2 border border-ink-200 p-4">
                    <div className="text-sm font-semibold">{displayPhoneme(phoneme)}</div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div>
                        <div className="text-sm font-medium">Position</div>
                        <div className="mt-1">
                          <Select
                            value={plan.position}
                            onChange={(e) =>
                              updatePlan(phoneme, { position: e.target.value as Position })
                            }
                          >
                            <option value="initial">Initial</option>
                            <option value="medial">Medial</option>
                            <option value="final">Final</option>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Word count</div>
                        <Input
                          type="number"
                          value={plan.itemCount}
                          onChange={(e) =>
                            updatePlan(phoneme, { itemCount: Number(e.target.value || 0) })
                          }
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Reps per word</div>
                        <Input
                          type="number"
                          value={plan.reps}
                          onChange={(e) => updatePlan(phoneme, { reps: Number(e.target.value || 0) })}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {selectedPhonemes.length === 0 ? (
                <div className="text-sm text-ink-600">No phonemes selected yet.</div>
              ) : null}
            </div>

            <div className="rounded-xl2 border border-ink-200 p-4">
              <div className="text-sm font-semibold">Quick Presets (Apply to all selected phonemes)</div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {[
                  { t: "Quick", items: 6, reps: 2 },
                  { t: "Standard", items: 10, reps: 3 },
                  { t: "Challenge", items: 15, reps: 4 },
                ].map((preset) => (
                  <Button
                    key={preset.t}
                    variant="secondary"
                    onClick={() =>
                      setPhonemePlans((prev) => {
                        const next = { ...prev };
                        for (const p of selectedPhonemes) {
                          next[p] = {
                            ...(next[p] ?? DEFAULT_PLAN),
                            itemCount: preset.items,
                            reps: preset.reps,
                          };
                        }
                        return next;
                      })
                    }
                  >
                    {preset.t}: {preset.items} words • {preset.reps} reps
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Next</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 3 */}
      {step === 3 ? (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">3) Pick words</div>
                <div className="mt-1 text-sm text-ink-600">
                  Auto-generated from word_bank.json (strict selected-phoneme + position match).
                </div>
              </div>
              <div className="text-right">
                <Badge tone={warning ? "blue" : "gray"}>{wordPoolCount} matches</Badge>
                {warning ? <div className="mt-1 text-xs text-ink-600">{warning}</div> : null}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <div>
                <div className="text-sm font-medium">Syllables</div>
                <div className="mt-2 grid grid-cols-4 gap-2 max-w-sm">
                  {[1, 2, 3, 4].map((n) => {
                    const selected = selectedSyllables.includes(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => toggleSyllable(n)}
                        className={`rounded-xl2 border px-3 py-2 text-sm font-semibold ${
                          selected
                            ? "border-nuvo-300 bg-nuvo-50 text-nuvo-800"
                            : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-ink-500">
                  Selected: {selectedSyllables.length ? selectedSyllables.join(", ") : "None"}
                </div>
              </div>
              <div className="flex items-end justify-end gap-2">
                <Button variant="secondary" onClick={shuffleWords}>
                  Shuffle
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {selectedPhonemes.map((phonemeKey) => (
                <div key={phonemeKey} className="rounded-xl2 border border-ink-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{displayPhoneme(phonemeKey)}</div>
                    <Badge tone="gray">{(itemsByPhoneme[phonemeKey] ?? []).length}</Badge>
                  </div>
                  <div className="mt-2 space-y-2">
                    {(itemsByPhoneme[phonemeKey] ?? []).map((it) => (
                      <div
                        key={`${it.word}-${it.phoneme}-${it.position}`}
                        className="flex items-start justify-between gap-2 rounded-lg border border-ink-200 p-2"
                      >
                        <div>
                          <div className="text-sm font-semibold">{it.word}</div>
                          <div className="mt-1 text-xs text-ink-500">
                            {it.position} • {it.syllables} syllables • {it.reps} reps
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              openEditWordModal({
                                word: it.word,
                                phoneme: it.phoneme,
                                position: it.position,
                              })
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeWord(it.word, it.phoneme, it.position)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(itemsByPhoneme[phonemeKey] ?? []).length === 0 ? (
                      <div className="text-sm text-ink-500">No words selected for this phoneme.</div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={() => setStep(4)}>Next</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 4 */}
      {step === 4 ? (
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold">4) Add examples (optional)</div>
            <div className="mt-1 text-sm text-ink-600">
              Upload audio/video exemplars globally or per-word.
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-xl2 border border-ink-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Global exemplar</div>
                  <div className="text-sm text-ink-600">
                    Plays before each attempt unless overridden per word.
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => uploadExample("audio")}>
                    Upload audio
                  </Button>
                  <Button variant="secondary" onClick={() => uploadExample("video")}>
                    Upload video
                  </Button>
                </div>
              </div>

              {globalExUrl ? (
                <div className="mt-3">
                  <div className="text-xs text-ink-500">Preview</div>
                  <audio controls src={globalExUrl} className="mt-2 w-full" />
                </div>
              ) : (
                <div className="mt-3 text-sm text-ink-600">No global exemplar yet.</div>
              )}
            </div>

            <div className="rounded-xl2 border border-ink-200 p-4">
              <div className="text-sm font-semibold">Playback settings</div>
              <div className="mt-3 grid gap-2 text-sm text-ink-700 md:grid-cols-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={playBefore}
                    onChange={(e) => setPlayBefore(e.target.checked)}
                  />
                  Play before attempt
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowReplay}
                    onChange={(e) => setAllowReplay(e.target.checked)}
                  />
                  Allow replay
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={requireReplay}
                    onChange={(e) => setRequireReplay(e.target.checked)}
                  />
                  Require replay
                </label>
              </div>
            </div>

            <div className="rounded-xl2 border border-ink-200 p-4">
              <div className="text-sm font-semibold">Per-word examples</div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {items.map((it) => (
                  <div key={it.word} className="rounded-xl2 border border-ink-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">{it.word}</div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => uploadExample("audio", it.word)}
                      >
                        + Example
                      </Button>
                    </div>

                    {perItemEx[it.word]?.url ? (
                      <audio controls src={perItemEx[it.word].url} className="mt-2 w-full" />
                    ) : (
                      <div className="mt-2 text-sm text-ink-600">No per-word example.</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button onClick={() => setStep(5)}>Next</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 5 */}
      {step === 5 ? (
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold">5) Choose game</div>
            <div className="mt-1 text-sm text-ink-600">
              A recommended game is preselected — switch anytime.
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {games.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGameId(g.id)}
                  className={`rounded-xl2 border p-4 text-left shadow-subtle hover:bg-ink-50 ${
                    gameId === g.id ? "border-nuvo-300 bg-nuvo-50" : "border-ink-200 bg-white"
                  }`}
                >
                  <div className="text-sm font-semibold">{g.name}</div>
                  <div className="mt-1 text-sm text-ink-600">Minigame ID: {g.id}</div>
                </button>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(4)}>
                Back
              </Button>
              <Button onClick={() => setStep(6)}>Next</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 6 */}
      {step === 6 ? (
        <Card>
          <CardHeader>
            <div className="text-sm font-semibold">6) Schedule & parent note</div>
            <div className="mt-1 text-sm text-ink-600">
              Review everything, then assign or save a draft.
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-sm font-medium">Due date</div>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div>
                  <div className="text-sm font-medium">Days per week</div>
                  <Select
                    value={String(daysPerWeek)}
                    onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                  >
                    {[2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={String(n)}>
                        {n}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">Parent note</div>
                <div className="mt-1">
                  <Textarea rows={5} value={parentNote} onChange={(e) => setParentNote(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="rounded-xl2 border border-ink-200 bg-white p-4 shadow-subtle">
              <div className="text-sm font-semibold">Summary</div>
              <div className="mt-2 space-y-1 text-sm text-ink-700">
                <div>
                  <span className="text-ink-500">Target:</span>{" "}
                  {selectedPhonemes.length ? selectedPhonemes.map(displayPhoneme).join(", ") : "—"}
                </div>
                <div>
                  <span className="text-ink-500">Words:</span> {items.length}
                </div>
                <div>
                  <span className="text-ink-500">Configured words:</span> {desiredItemCount}
                </div>
                <div>
                  <span className="text-ink-500">Game:</span> {gameId}
                </div>
                <div>
                  <span className="text-ink-500">Global example:</span> {globalExId ? "Yes" : "No"}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Button className="w-full" onClick={() => finalize("assigned")}>
                  Assign homework
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => finalize("draft")}>
                  Save draft
                </Button>
              </div>

              <div className="mt-3">
                <Button variant="ghost" className="w-full" onClick={() => setStep(5)}>
                  Back
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

          {editingItem ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-xl2 border border-ink-200 bg-white p-4 shadow-subtle">
                <div className="text-sm font-semibold">Edit Word</div>
                <div className="mt-1 text-sm text-ink-600">
                  Replace word for {displayPhoneme(editingItem.phoneme)} ({editingItem.position}).
                </div>
                <div className="mt-3">
                  <Input
                    value={editWordInput}
                    onChange={(e) => setEditWordInput(e.target.value)}
                    placeholder="Enter replacement word"
                  />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setEditingItem(null)}>
                    Cancel
                  </Button>
                  <Button onClick={saveEditedWord}>Save</Button>
                </div>
              </div>
            </div>
          ) : null}

          {showAddWordModal ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-2xl rounded-xl2 border border-ink-200 bg-white p-4 shadow-subtle">
                <div className="text-sm font-semibold">Add Word to Library</div>
                <div className="mt-1 text-sm text-ink-600">
                  Fill out the fields used by the word bank (`text`, `syllables`, `phonemes`,
                  `positions`).
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium">Text</div>
                    <Input value={newWordText} onChange={(e) => setNewWordText(e.target.value)} />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Syllables</div>
                    <Input
                      type="number"
                      value={newWordSyllables}
                      onChange={(e) => setNewWordSyllables(Number(e.target.value || 1))}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-sm font-medium">Phonemes</div>
                  <div className="mt-2 grid grid-cols-6 gap-2">
                    {availablePhonemes.map((p) => {
                      const selected = newWordPhonemes.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => toggleNewWordPhoneme(p)}
                          className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                            selected
                              ? "border-nuvo-300 bg-nuvo-50 text-nuvo-800"
                              : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
                          }`}
                        >
                          {displayPhoneme(p)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {newWordPhonemes.map((p) => (
                    <div key={p} className="rounded-lg border border-ink-200 p-3">
                      <div className="text-sm font-medium">{displayPhoneme(p)} positions</div>
                      <div className="mt-2 flex gap-2">
                        {(["initial", "medial", "final"] as Position[]).map((pos) => {
                          const selected = (newWordPositions[p] ?? []).includes(pos);
                          return (
                            <button
                              key={pos}
                              type="button"
                              onClick={() => toggleNewWordPosition(p, pos)}
                              className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                                selected
                                  ? "border-nuvo-300 bg-nuvo-50 text-nuvo-800"
                                  : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
                              }`}
                            >
                              {pos}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowAddWordModal(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={addWordToLibraryFromModal}>Add to library</Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
