// Baut die System-Prompts aus der Datenbasis (data/*.json).
// Die Texte sind deterministisch, damit Prompt-Caching greift: gleiche Daten → gleicher Prompt.
import legends from "../../data/legends.json";
import gear from "../../data/gear.json";
import exArcher from "../../data/examples/freund-archer.json";
import exSamurai from "../../data/examples/freund-samurai.json";
import exMercenary from "../../data/examples/freund-mercenary.json";
import exShinobi from "../../data/examples/freund-shinobi.json";
import exOwnShinobi from "../../data/examples/shinobi-loadout.json";

type Json = any; // Die Datenbasis ist frei strukturiertes JSON
const L: Json = legends;
const G: Json = gear;
const EXAMPLES: Json[] = [exArcher, exSamurai, exMercenary, exShinobi, exOwnShinobi];

export const CLASS_KEYS = Object.keys(L.classes) as string[];
export const ITEM_KEYS = Object.keys(G.items) as string[];
export const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];

const range = (p: Json) => (p.min != null ? `${p.min}–${p.max}` : p.range);

function gearCatalog(): string {
  const out: string[] = [];
  for (const key of ITEM_KEYS) {
    const it = G.items[key];
    out.push(`### ${key} – ${it.name} (Slot-Art: ${it.slot})`);
    out.push(`Varianten: ${it.variants.map((v: Json) => v.name + (v.legendary ? " [Legendary]" : "")).join("; ")}`);
    for (const [group, props] of Object.entries(it.properties || {}) as [string, Json[]][]) {
      out.push(`${group}: ${props.map((p) => `${p.name} (${range(p)} %)`).join("; ")}`);
    }
    if (it.perks?.length) {
      out.push(`Perks: ${it.perks.map((p: Json) => `${p.name}${p.appliesTo ? ` [nur ${p.appliesTo}]` : ""} – ${p.details}`).join(" | ")}`);
    }
    out.push("");
  }
  return out.join("\n");
}

function slotStructure(): string {
  return CLASS_KEYS.map((k) => {
    const c = L.classes[k];
    const s = c.gearSlots;
    return `- ${k} (${c.name}): ${s.melee} Nahkampf, ${s.ranged} Fernkampf, ${s.charm} Charm, ${s.offensiveTool} offensives und ${s.defensiveTool} defensives Ghost Tool. ${s.note}`;
  }).join("\n");
}

function glossary(): string {
  const pairs = new Map<string, string>();
  for (const ex of EXAMPLES) {
    for (const it of ex.items) {
      if (it.variantDe) pairs.set(it.variantDe, it.variant);
      if (it.perkDe) pairs.set(it.perkDe, it.perk);
      for (const p of it.properties) if (p.nameDe) pairs.set(p.nameDe, p.name);
    }
  }
  pairs.set("Episch", "epic");
  pairs.set("Legendär", "legendary");
  return [...pairs.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([de, en]) => `${de} = ${en}`).join("\n");
}

function gradeRules(): string {
  const gr = G.meta.grades;
  const obs = Object.entries(gr.legendary.observedMax).map(([k, v]) => `${k}: ${v}`).join("; ");
  return [
    `Noten: ${gr.scale.join(", ")}, S. ${gr.formula}`,
    `Legendary: ${gr.legendary.model} Beobachtete Legendary-Maxima: ${obs}. Regel: Epic-Bereich 2–11 → Legendary-Maximum 12. Andere Legendary-Maxima sind unbekannt.`,
    `Seltenheit: ${Object.entries(G.meta.rarity).map(([r, v]: [string, Json]) => `${r} = ${v.properties} Properties, ${v.perks} Perk`).join("; ")}. Bis Klassenrang 24 ist 1 Legendary erlaubt, ab Rang 24 sind es 2.`,
    `Upgrade: ${G.meta.upgrade}`
  ].join("\n");
}

function classText(k: string): string {
  const c = L.classes[k];
  const lines = [
    `## Klasse ${c.name} (${k}) – ${c.specialty.de}`,
    c.summary.de,
    `Startausrüstung: ${c.startingGear.join(", ")}. Freischaltungen: ${c.unlocks.map((u: Json) => `Rang ${u.rank} ${u.name}`).join("; ")}.`,
    `Ultimate: ${c.ultimate.name} – ${c.ultimate.desc.de}`,
    ...c.abilities.map((a: Json) => `Klassenfähigkeit ab Rang ${a.rank}: ${a.name} (Cooldown ${a.cooldownSec ?? "?"} s) – ${a.desc.de}`),
    "Perks (pro Slot 1/2/3 eine Variante, vermutlich):",
    ...c.perks.map((p: Json) => `- ${p.id} Rang ${p.rank}: ${p.name} – ${p.desc.de}`),
    "Passive:",
    ...c.passives.map((p: Json) => `- Rang ${p.rank}: ${p.name} – ${p.desc.de}`),
    "Hinweise aus Patches:",
    ...c.patchNotes.map((n: Json) => `- ${n.patch}: ${n.de}`)
  ];
  return lines.join("\n");
}

function referenceBuilds(k: string): string {
  const own = EXAMPLES.filter((e) => e.meta.class === k);
  if (!own.length) return "Keine Referenz-Builds für diese Klasse vorhanden.";
  return own.map((e) => [
    `### ${e.meta.title} – ${e.meta.description}`,
    ...e.items.map((it: Json) => `- ${it.slot}: ${it.variant} (${it.rarity}, Ki ${it.ki}) – ${it.properties.map((p: Json) => `${p.name} +${p.value} % [${p.grade}]`).join(", ")} – Perk ${it.perk}`)
  ].join("\n")).join("\n\n");
}

const CATALOG = gearCatalog();
const GLOSSARY = glossary();
const GRADE_RULES = gradeRules();

export const EXTRACT_SYSTEM = `Du liest Screenshots des Ausrüstungs-Bildschirms aus dem Spiel Ghost of Yōtei, Modus Legends, und überträgst sie in strukturierte Daten.

Ein solcher Bildschirm zeigt bis zu sieben Ausrüstungsteile untereinander. Pro Teil: Name der Variante, Seltenheit (Epic/Episch, Legendary/Legendär …), Ki-Wert, zwei Properties mit Prozentwert und Note (D- bis S) und den Perk in roter Großschrift. Die Spieloberfläche kann Englisch oder Deutsch sein.

Regeln:
- Gib Namen von Varianten, Properties und Perks immer mit dem englischen Namen aus dem Katalog unten an, exakt so geschrieben. Den Text, wie er im Bild steht, trägst du zusätzlich in die Felder *Shown* ein.
- Deutsche Begriffe übersetzt du mit dem Glossar. Steht ein Begriff nicht im Glossar, wähle den inhaltlich passenden Katalognamen dieses Gegenstandstyps; ist das unsicher, nenne es in "notes".
- "type" ist der Gegenstandstyp aus dem Katalog (z. B. katana, yumi, blindBomb, charm, kunai, smokeBomb). Die Variante muss zu diesem Typ gehören.
- Werte als Zahl mit Punkt als Dezimaltrenner (aus "+17,4 %" wird 17.4). Noten exakt wie angezeigt (S, A+, A, A-, B+ …).
- Die Klasse ergibt sich aus der Slot-Struktur (siehe unten), z. B. zwei Fernkampfwaffen = archer, vier Nahkampfwaffen = samurai. Ist sie nicht eindeutig, nimm "unknown".
- Erfinde nichts. Was du nicht lesen kannst, lässt du weg und erwähnst es in "notes". Ist das Bild kein solcher Ausrüstungs-Bildschirm, gib eine leere Liste und erkläre es in "notes".

## Slot-Struktur der Klassen
${slotStructure()}

## Glossar Deutsch = Englisch
${GLOSSARY}

## Katalog der Ausrüstung
${CATALOG}`;

const tipsSystemCache = new Map<string, string>();
export function tipsSystem(k: string): string {
  if (!tipsSystemCache.has(k)) {
    tipsSystemCache.set(k, `Du bist ein erfahrener Coach für Ghost of Yōtei: Legends und berätst zwei Brüder, die zusammen spielen. Du bekommst einen Build als JSON, den der Konfigurator aus dem Spiel ausgelesen und berechnet hat, und gibst konkrete, umsetzbare Tipps auf Deutsch.

Regeln:
- Stütze dich auf die Daten unten und auf die Werte im Build. Wo die Daten etwas offen lassen (z. B. wie Boni verrechnet werden, Legendary-Maxima), sag das ehrlich, statt zu raten.
- Nenne Spielbegriffe (Varianten, Properties, Perks) englisch, wie im Spiel.
- Gute Tipps sind konkret: welches Teil, welche Property, welcher Perk, warum – z. B. ein Reroll einer schwachen Property, ein besser passender Perk, eine fehlende Konterwaffe, eine Synergie mit Klassen-Perks oder Passiven.
- Sortiere nach Wirkung: Was bringt am meisten für den geringsten Aufwand?
- Höchstens 7 Tipps. Keine Floskeln.

## Noten, Seltenheit und Bereiche
${GRADE_RULES}

${classText(k)}

## Referenz-Builds aus dem Spiel
${referenceBuilds(k)}

## Katalog der Ausrüstung
${CATALOG}

## Offene Punkte der Datenbasis
${L.meta.openIssues.map((i: string) => "- " + i).join("\n")}`);
  }
  return tipsSystemCache.get(k)!;
}

// ---------------------------------------------------------------- Antwortformate (JSON Schema)
const obj = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });

export const EXTRACT_SCHEMA = obj({
  class: { type: "string", enum: [...CLASS_KEYS, "unknown"] },
  uiLanguage: { type: "string", enum: ["de", "en", "other"] },
  items: {
    type: "array",
    items: obj({
      type: { type: "string", enum: ITEM_KEYS },
      variant: { type: "string" },
      variantShown: { type: "string" },
      rarity: { type: "string", enum: RARITIES },
      ki: { type: "integer" },
      properties: {
        type: "array",
        items: obj({ name: { type: "string" }, nameShown: { type: "string" }, value: { type: "number" }, grade: { type: "string" } })
      },
      perk: { type: "string" },
      perkShown: { type: "string" }
    })
  },
  confidence: { type: "string", enum: ["high", "medium", "low"] },
  notes: { type: "string" }
});

export const TIPS_SCHEMA = obj({
  summary: { type: "string" },
  strengths: { type: "array", items: { type: "string" } },
  tips: {
    type: "array",
    items: obj({
      priority: { type: "string", enum: ["hoch", "mittel", "niedrig"] },
      title: { type: "string" },
      detail: { type: "string" },
      slot: { type: "string" }
    })
  },
  caveats: { type: "array", items: { type: "string" } }
});
