// Regressietest C7 (N1-W06): een koppelen-item rendert zonder foutscherm, ook na het laden en na het insturen.
// Vóór de fix draaide de geschudde rechterkolom als hook binnen renderInteraction(): React #310 bij het eerste bezoek
// (meer hooks dan in de laad-render) en #300 na Indienen (minder hooks). Deze test rendert de echte CurriculumItemPage.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const ITEM = {
  id: "11111111-1111-1111-1111-111111111111",
  item_id: "U6-test-koppelen",
  unit_code: "U6",
  week: 6,
  skill: "lezen",
  exercise_type: "koppelen",
  exercise_subtype: "",
  display_order: 1,
  instruction_nl: "Koppel elk woord aan zijn betekenis.",
  question: "",
  options: ["بَارِدٌ", "حَارٌّ"],
  correct_answer: "بَارِدٌ=koud|حَارٌّ=warm",
  correct_options: null,
  feedback_correct: "Juist — beide paren kloppen.",
  feedback_incorrect: "Kijk nog eens naar de betekenissen.",
  input_arabic: "",
  input_transliteration: "",
  input_translation_nl: "",
  reference_media: "",
  media_production: ["geen"],
  points: 2,
  review_flag: "",
  is_published: true,
  strict_tashkeel: false,
  needs_ns_audio: false,
  needs_image: false,
  audio_url: null,
  image_url: null,
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback || key, i18n: { language: "nl" } }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
vi.mock("react-router-dom", () => ({
  useParams: () => ({ itemId: "11111111-1111-1111-1111-111111111111" }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => <a href={to} {...props}>{children}</a>,
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u-1" }, isAdmin: false, isTeacher: false }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => ({ upload: vi.fn() }) } } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/curriculum-admin", () => ({ deleteCurriculumItem: vi.fn() }));
vi.mock("@/components/curriculum/CurriculumItemEditDialog", () => ({ CurriculumItemEditDialog: () => null }));
vi.mock("@/components/curriculum/CurriculumItemMediaView", () => ({ CurriculumItemMediaView: () => null }));

const apiMutate = vi.fn().mockResolvedValue({});
vi.mock("@/lib/supabase-api", () => ({
  // Elke query krijgt een kettingbare nep-builder; de tabel en het einde (maybeSingle) bepalen het antwoord.
  apiQuery: vi.fn(async (table: string, build: (q: unknown) => unknown) => {
    let single = false;
    const q: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "order"]) q[m] = () => q;
    q.maybeSingle = () => { single = true; return q; };
    build(q);
    if (table === "curriculum_items") return single ? ITEM : [{ id: ITEM.id, display_order: 1, created_at: "2026-10-27", item_id: ITEM.item_id }];
    return [];
  }),
  apiMutate: (...args: unknown[]) => apiMutate(...args),
  // Unit-toegang (main 244de3e, useUnitAccess): de testleerder heeft toegang tot U6.
  apiRpc: vi.fn(async () => [{ unit_code: "U6", level_id: null, is_accessible: true, unlock_date: null }]),
}));

import CurriculumItemPage from "@/pages/CurriculumItemPage";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CurriculumItemPage />
    </QueryClientProvider>
  );
}

describe("CurriculumItemPage · koppelen (C7)", () => {
  beforeEach(() => apiMutate.mockClear());

  it("rendert na het laden de linkerkolom en een keuzelijst per rij, zonder foutscherm", async () => {
    renderPage();
    expect(await screen.findByText("بَارِدٌ")).toBeInTheDocument();
    expect(screen.getByText("حَارٌّ")).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });

  it("kan juist insturen en daarna opnieuw proberen, zonder foutscherm", async () => {
    renderPage();
    await screen.findByText("بَارِدٌ");
    const [eerste, tweede] = screen.getAllByRole("combobox") as [HTMLElement, HTMLElement];
    fireEvent.change(eerste, { target: { value: "koud" } });
    fireEvent.change(tweede, { target: { value: "warm" } });
    fireEvent.click(screen.getByRole("button", { name: "Indienen" }));
    expect(await screen.findByText("Juist!")).toBeInTheDocument();
    await waitFor(() => expect(apiMutate).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Opnieuw" }));
    expect(await screen.findAllByRole("combobox")).toHaveLength(2);
  });

  it("rekent een fout paar fout en toont de sleutel als genummerde lijst", async () => {
    renderPage();
    await screen.findByText("بَارِدٌ");
    const [eerste, tweede] = screen.getAllByRole("combobox") as [HTMLElement, HTMLElement];
    fireEvent.change(eerste, { target: { value: "warm" } });
    fireEvent.change(tweede, { target: { value: "koud" } });
    fireEvent.click(screen.getByRole("button", { name: "Indienen" }));
    expect(await screen.findByText("Nog niet juist")).toBeInTheDocument();
    expect(screen.getByText("بَارِدٌ=koud")).toBeInTheDocument();
  });
});
