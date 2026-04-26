import { useState, useEffect } from "react";
import data from "./session-data.json";

// ============================================================================
// THEME — DM Cockpit
// Higher contrast than the player wiki. Same campaign palette, rebalanced
// for fast scanning under variable session lighting.
// ============================================================================
const C = {
  bg: "#0a0907",          // deep ink-black background
  panel: "#15110b",       // panel bg, slightly lifted
  panelHi: "#1f180e",     // hovered/active panel
  panelMute: "#100c08",   // muted panel for secondary content
  border: "#3a2e18",      // subtle borders
  borderHi: "#5a4a26",    // emphasized borders
  text: "#f0e6d0",        // primary text
  textMute: "#a89878",    // secondary text
  textDim: "#6e6147",     // tertiary, captions
  gold: "#d4a847",        // primary accent
  goldBright: "#f5d97a",  // emphasized accent
  goldDeep: "#8a6f2c",    // muted accent
  // Functional colors
  secret: "#c94d3d",      // DM-only / hidden info — RED for fast secret-scan
  secretBg: "#3a1612",
  scenery: "#7da66a",     // read-aloud — GREEN for "say this"
  sceneryBg: "#16231a",
  dialogue: "#5fa3c7",    // dialogue seeds — BLUE for "Pharazôr says"
  dialogueBg: "#11202b",
  warning: "#d68c2a",      // important notes — AMBER
  warningBg: "#2a1d0a",
  success: "#5fa86c",     // checked items
};

// ============================================================================
// FONTS — Cinzel for headers (matches campaign), Crimson for body, IBM Plex
// Mono for stat blocks and skill check tables (functional, scannable).
// ============================================================================
const fonts = {
  display: "'Cinzel', 'Trajan Pro', serif",
  body: "'Crimson Text', Georgia, serif",
  mono: "'IBM Plex Mono', 'Menlo', monospace",
};

// ============================================================================
// Storage helpers — localStorage with namespaced keys
// ============================================================================
const STORAGE_PREFIX = "mew-s19-";
const lsGet = (key, fallback) => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const lsSet = (key, value) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {}
};

// ============================================================================
// Reusable atoms
// ============================================================================
function HeadingDisplay({ children, size = 24, color = C.goldBright, mb = 0 }) {
  return (
    <h1 style={{
      fontFamily: fonts.display,
      fontSize: size,
      color,
      letterSpacing: "0.06em",
      fontWeight: 600,
      marginBottom: mb,
      lineHeight: 1.2,
    }}>{children}</h1>
  );
}

function Label({ children, color = C.goldDeep, size = 10 }) {
  return (
    <span style={{
      fontFamily: fonts.display,
      fontSize: size,
      color,
      letterSpacing: "0.15em",
      textTransform: "uppercase",
      fontWeight: 500,
    }}>{children}</span>
  );
}

function Body({ children, color = C.text, size = 15, italic = false, mb = 0 }) {
  return (
    <div style={{
      fontFamily: fonts.body,
      fontSize: size,
      color,
      lineHeight: 1.6,
      fontStyle: italic ? "italic" : "normal",
      marginBottom: mb,
    }}>{children}</div>
  );
}

function Card({ children, bg = C.panel, border = C.border, padding = 14, mb = 10, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 4,
        padding,
        marginBottom: mb,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 120ms",
      }}
    >{children}</div>
  );
}

// Box for read-aloud-style scenery — visually distinct, easy to glance at
function ReadAloudBox({ children }) {
  return (
    <div style={{
      background: C.sceneryBg,
      border: `1px solid ${C.scenery}55`,
      borderLeft: `4px solid ${C.scenery}`,
      borderRadius: 4,
      padding: "16px 18px",
      marginBottom: 14,
    }}>
      <div style={{ marginBottom: 8 }}>
        <Label color={C.scenery} size={10}>📜 Read-aloud (paraphrase)</Label>
      </div>
      <Body color={C.text} italic size={16}>{children}</Body>
    </div>
  );
}

// Box for DM-only secret info — distinctly red, scannable
function SecretBox({ children, label = "🔒 DM only" }) {
  return (
    <div style={{
      background: C.secretBg,
      border: `1px solid ${C.secret}55`,
      borderLeft: `4px solid ${C.secret}`,
      borderRadius: 4,
      padding: "12px 14px",
      marginBottom: 10,
    }}>
      <div style={{ marginBottom: 6 }}>
        <Label color={C.secret} size={10}>{label}</Label>
      </div>
      <Body color={C.text} size={14}>{children}</Body>
    </div>
  );
}

// Box for dialogue seeds — visually distinct from prose
function DialogueBox({ children }) {
  return (
    <div style={{
      background: C.dialogueBg,
      border: `1px solid ${C.dialogue}44`,
      borderLeft: `3px solid ${C.dialogue}`,
      borderRadius: 4,
      padding: "10px 14px",
      marginBottom: 8,
      fontFamily: fonts.body,
      fontSize: 15,
      color: C.text,
      fontStyle: "italic",
      lineHeight: 1.55,
    }}>"{children}"</div>
  );
}

// Toggle for showing/hiding hidden NPC info
function HiddenToggle({ open, onToggle, children }) {
  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          background: "transparent",
          border: `1px solid ${C.secret}66`,
          color: C.secret,
          padding: "5px 10px",
          fontFamily: fonts.display,
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          cursor: "pointer",
          borderRadius: 3,
          marginBottom: 8,
        }}
      >{open ? "▾ Hide DM-only" : "▸ Reveal DM-only"}</button>
      {open && children}
    </div>
  );
}

// ============================================================================
// Skill check table — 5-tier display
// ============================================================================
function SkillCheckTable({ check }) {
  return (
    <div style={{
      background: C.panelMute,
      border: `1px solid ${C.border}`,
      borderRadius: 4,
      padding: "12px 14px",
      marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
        <span style={{
          fontFamily: fonts.display,
          fontSize: 13,
          color: C.goldBright,
          letterSpacing: "0.05em",
          fontWeight: 600,
        }}>{check.skill}</span>
        {check.dc && (
          <span style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            color: C.warning,
            background: C.warningBg,
            padding: "1px 6px",
            borderRadius: 2,
          }}>DC {check.dc}</span>
        )}
      </div>
      {check.context && (
        <div style={{
          fontFamily: fonts.body,
          fontSize: 13,
          color: C.textMute,
          marginBottom: 8,
          fontStyle: "italic",
        }}>{check.context}</div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px" }}>
        {check.tiers.map((tier, i) => (
          <ResultTier key={i} range={tier.range} outcome={tier.outcome} />
        ))}
      </div>
    </div>
  );
}

function ResultTier({ range, outcome }) {
  // Color-code ranges by tier
  const isBest = range.toLowerCase().includes("nat 20") || range.toLowerCase().includes("20+") || range.toLowerCase().includes("nat20");
  const isFail = range.toLowerCase().includes("< 10") || range.toLowerCase().includes("failure");
  const color = isBest ? C.goldBright : isFail ? C.secret : C.textMute;
  return (
    <>
      <span style={{
        fontFamily: fonts.mono,
        fontSize: 12,
        color,
        whiteSpace: "nowrap",
        paddingTop: 1,
      }}>{range}</span>
      <span style={{
        fontFamily: fonts.body,
        fontSize: 14,
        color: C.text,
        lineHeight: 1.5,
      }}>{outcome}</span>
    </>
  );
}

// ============================================================================
// Page: Scene Navigator (the main DM-runner view)
// ============================================================================
function ScenePage({ sceneId, scenes, onSelect, sceneState, toggleScene }) {
  const scene = scenes.find(s => s.id === sceneId) || scenes[0];
  const completed = sceneState[scene.id]?.completed || false;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 240px) 1fr", height: "100%", overflow: "hidden" }}>
      {/* Scene list sidebar */}
      <div style={{
        background: C.panelMute,
        borderRight: `1px solid ${C.border}`,
        overflowY: "auto",
        padding: "12px 0",
      }}>
        <div style={{ padding: "0 14px 12px", borderBottom: `1px solid ${C.border}`, marginBottom: 10 }}>
          <Label>Scenes</Label>
        </div>
        {scenes.map(s => {
          const isActive = s.id === scene.id;
          const isDone = sceneState[s.id]?.completed;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              style={{
                width: "100%",
                background: isActive ? C.panelHi : "transparent",
                border: "none",
                borderLeft: isActive ? `3px solid ${C.gold}` : "3px solid transparent",
                padding: "10px 14px",
                textAlign: "left",
                cursor: "pointer",
                color: isActive ? C.goldBright : isDone ? C.textDim : C.textMute,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontFamily: fonts.body,
                transition: "all 100ms",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.panel; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{
                fontFamily: fonts.mono,
                fontSize: 11,
                color: isActive ? C.gold : C.textDim,
                minWidth: 22,
              }}>{s.number}</span>
              <span style={{
                flex: 1,
                fontSize: 13,
                fontFamily: fonts.display,
                letterSpacing: "0.03em",
                textDecoration: isDone ? "line-through" : "none",
              }}>{s.title}</span>
              {isDone && <span style={{ color: C.success, fontSize: 11 }}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* Scene detail */}
      <div style={{ overflowY: "auto", padding: "20px 24px" }}>
        <SceneDetail scene={scene} completed={completed} onToggleComplete={() => toggleScene(scene.id)} />
      </div>
    </div>
  );
}

function SceneDetail({ scene, completed, onToggleComplete }) {
  return (
    <div style={{ maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 4, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 6 }}>
            <Label color={C.goldDeep}>Scene {scene.number}{scene.subtitle ? ` · ${scene.subtitle}` : ""}</Label>
          </div>
          <HeadingDisplay size={28}>{scene.title}</HeadingDisplay>
        </div>
        <button
          onClick={onToggleComplete}
          style={{
            background: completed ? C.success : "transparent",
            border: `1px solid ${completed ? C.success : C.border}`,
            color: completed ? C.bg : C.textMute,
            padding: "6px 12px",
            fontFamily: fonts.display,
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
            borderRadius: 3,
            whiteSpace: "nowrap",
            marginTop: 4,
          }}
        >{completed ? "✓ Done" : "Mark done"}</button>
      </div>

      {/* Meta strip */}
      <div style={{
        display: "flex",
        gap: 18,
        flexWrap: "wrap",
        padding: "12px 0",
        marginBottom: 16,
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
      }}>
        {scene.runtime && (
          <Meta label="Runtime" value={scene.runtime} />
        )}
        {scene.lighting && (
          <Meta label="Lighting" value={scene.lighting} />
        )}
        {scene.trigger && (
          <Meta label="Trigger" value={scene.trigger} />
        )}
      </div>

      {/* Location */}
      {scene.location && (
        <div style={{ marginBottom: 16 }}>
          <Label>Location</Label>
          <Body size={14} color={C.textMute}>{scene.location}</Body>
        </div>
      )}

      {/* Read-aloud */}
      {scene.readAloud && <ReadAloudBox>{scene.readAloud}</ReadAloudBox>}

      {/* Purpose */}
      {scene.purpose && (
        <Card bg={C.panelMute} mb={14}>
          <Label>Purpose</Label>
          <Body size={14} mb={0}>{scene.purpose}</Body>
        </Card>
      )}

      {/* DM notes */}
      {scene.dmNotes && scene.dmNotes.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ marginBottom: 8 }}>
            <Label color={C.secret}>🔒 DM Notes</Label>
          </div>
          {scene.dmNotes.map((note, i) => (
            <SecretBox key={i} label={null}>{note}</SecretBox>
          ))}
        </div>
      )}

      {/* Skill checks */}
      {scene.skillChecks && scene.skillChecks.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ marginBottom: 10 }}>
            <Label>🎲 Skill Checks</Label>
          </div>
          {scene.skillChecks.map((check, i) => (
            <SkillCheckTable key={i} check={check} />
          ))}
        </div>
      )}

      {/* Dialogue seeds */}
      {scene.dialogueSeeds && scene.dialogueSeeds.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ marginBottom: 10 }}>
            <Label color={C.dialogue}>💬 NPC Dialogue Seeds (paraphrase, never script)</Label>
          </div>
          {scene.dialogueSeeds.map((line, i) => (
            <DialogueBox key={i}>{line}</DialogueBox>
          ))}
        </div>
      )}

      {/* Branches */}
      {scene.branches && scene.branches.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ marginBottom: 10 }}>
            <Label>🌿 Branches</Label>
          </div>
          {scene.branches.map((b, i) => (
            <div key={i} style={{
              borderLeft: `3px solid ${C.goldDeep}`,
              paddingLeft: 14,
              marginBottom: 10,
            }}>
              <div style={{
                fontFamily: fonts.mono,
                fontSize: 12,
                color: C.gold,
                marginBottom: 4,
              }}>IF: {b.condition}</div>
              <Body size={14} color={C.textMute}>{b.outcome}</Body>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div style={{ minWidth: 100 }}>
      <div style={{ marginBottom: 2 }}>
        <Label size={9}>{label}</Label>
      </div>
      <div style={{
        fontFamily: fonts.body,
        fontSize: 13,
        color: C.text,
        lineHeight: 1.4,
      }}>{value}</div>
    </div>
  );
}

// ============================================================================
// Page: NPCs
// ============================================================================
function NpcPage() {
  const [revealed, setRevealed] = useState({});
  const toggle = id => setRevealed(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div style={{ overflowY: "auto", padding: "20px 24px", maxWidth: 800, margin: "0 auto" }}>
      <HeadingDisplay size={28} mb={6}>NPC Roster</HeadingDisplay>
      <Body color={C.textMute} mb={20} size={14}>
        Five NPCs across the session. Surface read shown by default; tap to reveal hidden motive and stats.
      </Body>

      {data.npcs.map(npc => {
        const isRevealed = revealed[npc.id];
        return (
          <Card key={npc.id} bg={C.panel} mb={14} padding={18}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{
                fontFamily: fonts.mono,
                fontSize: 12,
                color: C.textDim,
                background: C.panelMute,
                padding: "2px 8px",
                borderRadius: 2,
              }}>#{npc.order}</span>
              <HeadingDisplay size={18} mb={0}>{npc.name}</HeadingDisplay>
              <span style={{
                fontFamily: fonts.display,
                fontSize: 11,
                color: npc.status.toLowerCase().includes("hostile") ? C.secret :
                       npc.status.toLowerCase().includes("friendly") ? C.success :
                       C.warning,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: C.panelMute,
                padding: "3px 8px",
                borderRadius: 2,
              }}>{npc.status}</span>
            </div>

            <div style={{ marginBottom: 12 }}>
              <Label>Surface read</Label>
              <Body size={14} mb={0}>{npc.surfaceRead}</Body>
            </div>

            <HiddenToggle open={isRevealed} onToggle={() => toggle(npc.id)}>
              <SecretBox label="🔒 Hidden motive">{npc.hidden}</SecretBox>
              {npc.stats && (
                <div style={{
                  background: C.panelMute,
                  border: `1px solid ${C.border}`,
                  borderLeft: `3px solid ${C.warning}`,
                  borderRadius: 4,
                  padding: "10px 14px",
                  fontFamily: fonts.mono,
                  fontSize: 13,
                  color: C.text,
                  lineHeight: 1.6,
                }}>
                  <div style={{ marginBottom: 4 }}>
                    <Label color={C.warning} size={10}>⚔ Stats</Label>
                  </div>
                  {npc.stats}
                </div>
              )}
            </HiddenToggle>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================================
// Page: Skill Checks Reference
// ============================================================================
function SkillsPage() {
  const [filter, setFilter] = useState("all");

  // Flatten all skill checks across all scenes with scene context
  const allChecks = data.scenes.flatMap(scene =>
    (scene.skillChecks || []).map(check => ({ ...check, scene: scene.title, sceneNum: scene.number }))
  );

  // Build unique skill list for filter
  const allSkills = [...new Set(allChecks.map(c => c.skill.split(" ")[0]))].sort();

  const filtered = filter === "all" ? allChecks :
                   allChecks.filter(c => c.skill.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div style={{ overflowY: "auto", padding: "20px 24px", maxWidth: 800, margin: "0 auto" }}>
      <HeadingDisplay size={28} mb={6}>Skill Checks</HeadingDisplay>
      <Body color={C.textMute} mb={16} size={14}>
        All skill check tables in one place. {filtered.length} {filtered.length === 1 ? "check" : "checks"} {filter !== "all" ? `(filtered to ${filter})` : ""}.
      </Body>

      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>All</FilterButton>
        {allSkills.map(s => (
          <FilterButton key={s} active={filter === s} onClick={() => setFilter(s)}>{s}</FilterButton>
        ))}
      </div>

      {filtered.map((check, i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <div style={{ marginBottom: 6 }}>
            <Label color={C.goldDeep} size={10}>Scene {check.sceneNum} · {check.scene}</Label>
          </div>
          <SkillCheckTable check={check} />
        </div>
      ))}
    </div>
  );
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? C.gold : "transparent",
        border: `1px solid ${active ? C.gold : C.border}`,
        color: active ? C.bg : C.textMute,
        padding: "5px 12px",
        fontFamily: fonts.display,
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: "pointer",
        borderRadius: 3,
      }}
    >{children}</button>
  );
}

// ============================================================================
// Page: Scenery (read-aloud passages in one place)
// ============================================================================
function SceneryPage() {
  const scenesWithReadAloud = data.scenes.filter(s => s.readAloud);
  return (
    <div style={{ overflowY: "auto", padding: "20px 24px", maxWidth: 760, margin: "0 auto" }}>
      <HeadingDisplay size={28} mb={6}>Scenery</HeadingDisplay>
      <Body color={C.textMute} mb={20} size={14}>
        All read-aloud-style passages in one place. Paraphrase — never read verbatim.
      </Body>

      {scenesWithReadAloud.map(scene => (
        <div key={scene.id} style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 8 }}>
            <Label color={C.goldDeep}>Scene {scene.number} · {scene.title}</Label>
          </div>
          {scene.location && (
            <Body size={13} color={C.textDim} mb={8} italic>{scene.location}</Body>
          )}
          <ReadAloudBox>{scene.readAloud}</ReadAloudBox>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Page: Tracker (hidden conditions, foreshadowing, wrap checklist)
// ============================================================================
function TrackerPage({ trackerState, toggleTracker, resetSession }) {
  return (
    <div style={{ overflowY: "auto", padding: "20px 24px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 16 }}>
        <div>
          <HeadingDisplay size={28} mb={6}>Session Tracker</HeadingDisplay>
          <Body color={C.textMute} size={14}>Hidden conditions, foreshadowing, and wrap checklist. Saved to your browser.</Body>
        </div>
        <button
          onClick={resetSession}
          style={{
            background: "transparent",
            border: `1px solid ${C.secret}66`,
            color: C.secret,
            padding: "6px 12px",
            fontFamily: fonts.display,
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
            borderRadius: 3,
            whiteSpace: "nowrap",
          }}
        >Reset session</button>
      </div>

      {/* Hidden conditions */}
      <Section title="Active Hidden Conditions">
        {data.hiddenConditions.map((c, i) => (
          <Card key={i} bg={C.panelMute} mb={8} padding={12}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{
                fontFamily: fonts.display,
                fontSize: 13,
                color: C.goldBright,
                fontWeight: 600,
              }}>{c.subject}</span>
              <span style={{
                fontFamily: fonts.body,
                fontSize: 13,
                color: C.warning,
              }}>{c.condition}</span>
            </div>
            <Body size={13} color={C.textMute} mb={0}>{c.note}</Body>
          </Card>
        ))}
      </Section>

      {/* Ticking clocks */}
      <Section title="Ticking Clocks (party doesn't know)">
        {data.tickingClocks.map((c, i) => (
          <SecretBox key={i} label={c.label}>{c.detail}</SecretBox>
        ))}
      </Section>

      {/* Foreshadowing */}
      <Section title="Foreshadowing — drop these if you can">
        {data.foreshadowingChecklist.map(item => {
          const checked = trackerState[item.id] || false;
          return (
            <ChecklistItem
              key={item.id}
              checked={checked}
              onToggle={() => toggleTracker(item.id)}
              title={item.label}
              detail={item.detail}
            />
          );
        })}
      </Section>

      {/* Must be true */}
      <Section title="Must be true by end of session">
        {data.mustBeTrue.map((item, i) => (
          <div key={i} style={{
            borderLeft: `3px solid ${C.warning}`,
            paddingLeft: 12,
            marginBottom: 8,
          }}>
            <Body size={14} color={C.text} mb={0}>{item}</Body>
          </div>
        ))}
      </Section>

      {/* Can happen */}
      <Section title="Can happen but not required">
        {data.canHappen.map((item, i) => (
          <div key={i} style={{
            borderLeft: `2px solid ${C.border}`,
            paddingLeft: 12,
            marginBottom: 8,
          }}>
            <Body size={14} color={C.textMute} mb={0}>{item}</Body>
          </div>
        ))}
      </Section>

      {/* Wrap checklist */}
      <Section title="Session Wrap Checklist">
        {["Must verify", "Track for master doc", "Lock for Session 20"].map(category => {
          const items = data.wrapChecklist.filter(w => w.category === category);
          if (!items.length) return null;
          return (
            <div key={category} style={{ marginBottom: 14 }}>
              <div style={{ marginBottom: 6 }}>
                <Label color={C.goldDeep} size={10}>{category}</Label>
              </div>
              {items.map(item => {
                const checked = trackerState[item.id] || false;
                return (
                  <ChecklistItem
                    key={item.id}
                    checked={checked}
                    onToggle={() => toggleTracker(item.id)}
                    title={item.label}
                  />
                );
              })}
            </div>
          );
        })}
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>
        <Label size={11}>{title}</Label>
      </div>
      {children}
    </div>
  );
}

function ChecklistItem({ checked, onToggle, title, detail }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: "flex",
        gap: 10,
        padding: "8px 10px",
        background: checked ? C.sceneryBg : C.panelMute,
        border: `1px solid ${checked ? C.scenery + "55" : C.border}`,
        borderRadius: 3,
        marginBottom: 6,
        cursor: "pointer",
        alignItems: "flex-start",
        transition: "all 100ms",
      }}
    >
      <div style={{
        width: 16,
        height: 16,
        border: `1.5px solid ${checked ? C.scenery : C.textDim}`,
        borderRadius: 2,
        flexShrink: 0,
        marginTop: 2,
        background: checked ? C.scenery : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: C.bg,
        fontSize: 11,
        fontWeight: "bold",
      }}>{checked ? "✓" : ""}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: fonts.body,
          fontSize: 14,
          color: checked ? C.textMute : C.text,
          textDecoration: checked ? "line-through" : "none",
          lineHeight: 1.4,
        }}>{title}</div>
        {detail && (
          <div style={{
            fontFamily: fonts.body,
            fontSize: 12,
            color: C.textDim,
            marginTop: 2,
            lineHeight: 1.5,
          }}>{detail}</div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Page: Overview (the home screen — quick session snapshot)
// ============================================================================
function OverviewPage({ onJump }) {
  return (
    <div style={{ overflowY: "auto", padding: "20px 24px", maxWidth: 760, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 4 }}>
          <Label color={C.goldDeep}>Session {data.session.number} · {data.session.miniArc}</Label>
        </div>
        <HeadingDisplay size={36}>{data.session.title}</HeadingDisplay>
      </div>

      <Card bg={C.panel} mb={16} padding={18}>
        <Label>Opens with</Label>
        <Body size={15} mb={0}>{data.session.openingContext}</Body>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        <Card bg={C.panelMute} padding={14} mb={0}>
          <Label size={9}>In-world start</Label>
          <Body size={13} color={C.text} mb={0}>{data.session.inWorldStart}</Body>
        </Card>
        <Card bg={C.panelMute} padding={14} mb={0}>
          <Label size={9}>Expected runtime</Label>
          <Body size={13} color={C.text} mb={0}>{data.session.expectedRuntime}</Body>
        </Card>
      </div>

      {/* Quick links */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <QuickLink onClick={() => onJump("scenes", "scene-1")} title="▸ Start at Scene 1" subtitle="The Climb (narrative bridge)" />
        <QuickLink onClick={() => onJump("npcs")} title="▸ NPC Roster" subtitle={`${data.npcs.length} NPCs this session`} />
        <QuickLink onClick={() => onJump("skills")} title="▸ Skill Check Reference" subtitle="All tables, filterable" />
        <QuickLink onClick={() => onJump("tracker")} title="▸ Session Tracker" subtitle="Conditions + wrap checklist" />
      </div>

      {/* Three cliffhangers preview */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ marginBottom: 8 }}>
          <Label>End-of-session cliffhangers (Scene 8)</Label>
        </div>
        <Card bg={C.panelMute} mb={6} padding={12}>
          <Body size={13} mb={0}><b>A.</b> Combat erupts mid-conversation. End on initiative roll.</Body>
        </Card>
        <Card bg={C.panelMute} mb={6} padding={12}>
          <Body size={13} mb={0}><b>B.</b> Pharazôr's deal is on the table. Cut on the choice.</Body>
        </Card>
        <Card bg={C.panelMute} mb={6} padding={12}>
          <Body size={13} mb={0}><b>C.</b> Adrik claims the shard. Pharazôr's face changes. Cut to black.</Body>
        </Card>
      </div>
    </div>
  );
}

function QuickLink({ onClick, title, subtitle }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        textAlign: "left",
        padding: "12px 14px",
        cursor: "pointer",
        borderRadius: 4,
        transition: "all 100ms",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = C.panelHi;
        e.currentTarget.style.borderColor = C.goldDeep;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = C.panel;
        e.currentTarget.style.borderColor = C.border;
      }}
    >
      <div style={{
        fontFamily: fonts.display,
        fontSize: 13,
        color: C.goldBright,
        marginBottom: 2,
        letterSpacing: "0.04em",
      }}>{title}</div>
      <div style={{
        fontFamily: fonts.body,
        fontSize: 12,
        color: C.textMute,
      }}>{subtitle}</div>
    </button>
  );
}

// ============================================================================
// Top navigation bar
// ============================================================================
function TopNav({ page, onNav }) {
  const tabs = [
    { id: "overview", label: "Overview", icon: "◆" },
    { id: "scenes", label: "Scenes", icon: "▸" },
    { id: "npcs", label: "NPCs", icon: "✦" },
    { id: "skills", label: "Skills", icon: "◇" },
    { id: "scenery", label: "Scenery", icon: "❡" },
    { id: "tracker", label: "Tracker", icon: "✓" },
  ];

  return (
    <nav style={{
      background: C.panelMute,
      borderBottom: `1px solid ${C.border}`,
      display: "flex",
      alignItems: "stretch",
      flexShrink: 0,
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
    }}>
      <div style={{
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderRight: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 18, color: C.gold }}>⚔</span>
        <div>
          <div style={{
            fontFamily: fonts.display,
            fontSize: 12,
            color: C.goldBright,
            letterSpacing: "0.08em",
            lineHeight: 1.1,
          }}>S{data.session.number} DM SCREEN</div>
          <div style={{
            fontFamily: fonts.body,
            fontSize: 10,
            color: C.textDim,
            lineHeight: 1.1,
          }}>{data.session.title}</div>
        </div>
      </div>
      {tabs.map(t => {
        const active = page === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onNav(t.id)}
            style={{
              background: active ? C.panelHi : "transparent",
              border: "none",
              borderBottom: active ? `2px solid ${C.gold}` : "2px solid transparent",
              color: active ? C.goldBright : C.textMute,
              padding: "10px 16px",
              cursor: "pointer",
              fontFamily: fonts.display,
              fontSize: 12,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 7,
              whiteSpace: "nowrap",
              transition: "all 100ms",
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = C.text; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = C.textMute; }}
          >
            <span style={{ fontSize: 11 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ============================================================================
// Root App
// ============================================================================
export default function App() {
  const [page, setPage] = useState(() => lsGet("page", "overview"));
  const [activeScene, setActiveScene] = useState(() => lsGet("activeScene", "scene-1"));
  const [sceneState, setSceneState] = useState(() => lsGet("sceneState", {}));
  const [trackerState, setTrackerState] = useState(() => lsGet("trackerState", {}));

  // Persist page state to localStorage
  useEffect(() => { lsSet("page", page); }, [page]);
  useEffect(() => { lsSet("activeScene", activeScene); }, [activeScene]);
  useEffect(() => { lsSet("sceneState", sceneState); }, [sceneState]);
  useEffect(() => { lsSet("trackerState", trackerState); }, [trackerState]);

  const toggleScene = id => {
    setSceneState(prev => ({
      ...prev,
      [id]: { ...prev[id], completed: !prev[id]?.completed }
    }));
  };

  const toggleTracker = id => {
    setTrackerState(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const resetSession = () => {
    if (confirm("Reset all session progress? Scene completion, foreshadowing, and wrap checklist will be cleared. This can't be undone.")) {
      setSceneState({});
      setTrackerState({});
    }
  };

  const handleJump = (targetPage, sceneId) => {
    setPage(targetPage);
    if (sceneId) setActiveScene(sceneId);
  };

  return (
    <div style={{
      background: C.bg,
      color: C.text,
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      <TopNav page={page} onNav={setPage} />
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {page === "overview" && <OverviewPage onJump={handleJump} />}
        {page === "scenes" && (
          <ScenePage
            sceneId={activeScene}
            scenes={data.scenes}
            onSelect={setActiveScene}
            sceneState={sceneState}
            toggleScene={toggleScene}
          />
        )}
        {page === "npcs" && <NpcPage />}
        {page === "skills" && <SkillsPage />}
        {page === "scenery" && <SceneryPage />}
        {page === "tracker" && (
          <TrackerPage
            trackerState={trackerState}
            toggleTracker={toggleTracker}
            resetSession={resetSession}
          />
        )}
      </div>
    </div>
  );
}
