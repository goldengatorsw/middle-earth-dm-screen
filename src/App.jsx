import { useState, useEffect } from "react";
import data from "./session-data.json";
import world from "./world-data.json";
 
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
    <div style={{ overflowY: "auto", padding: "20px 24px", maxWidth: 800, margin: "0 auto", height: "100%" }}>
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
    <div style={{ overflowY: "auto", padding: "20px 24px", maxWidth: 800, margin: "0 auto", height: "100%" }}>
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
    <div style={{ overflowY: "auto", padding: "20px 24px", maxWidth: 760, margin: "0 auto", height: "100%" }}>
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
    <div style={{ overflowY: "auto", padding: "20px 24px", maxWidth: 800, margin: "0 auto", height: "100%" }}>
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
    <div style={{ overflowY: "auto", padding: "20px 24px", maxWidth: 760, margin: "0 auto", height: "100%" }}>
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
// WORLD — Phase 1
// Map (Leaflet) / Locations / NPCs / Factions / Timeline / Search
// All data from world-data.json. Cross-linkable via id-based references.
// ============================================================================

// --- Cross-linking: parse refs like "{npc:mez}" or "{location:lake-town}" in text ---
// Used in description fields. Output is React-renderable.
function renderLinkedText(text, onNav) {
  if (!text) return null;
  const re = /\{(npc|location|faction|event):([a-z0-9-]+)\}/gi;
  const parts = [];
  let last = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const [, kind, id] = match;
    parts.push(
      <a
        key={`${match.index}-${kind}-${id}`}
        onClick={(e) => { e.preventDefault(); onNav(kind, id); }}
        style={{ color: C.gold, cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted" }}
      >{worldEntityLabel(kind, id)}</a>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function worldEntityLabel(kind, id) {
  const collection = kind === "npc" ? world.npcs
    : kind === "location" ? world.locations
    : kind === "faction" ? world.factions
    : kind === "event" ? world.events : null;
  if (!collection) return id;
  const found = collection.find(e => e.id === id);
  return found ? found.name : id;
}

// --- Hyperlink atom for direct navigation (used in lists) ---
function WorldLink({ kind, id, onNav, children, dim }) {
  const label = children || worldEntityLabel(kind, id);
  return (
    <a
      onClick={(e) => { e.preventDefault(); onNav(kind, id); }}
      style={{
        color: dim ? C.textMute : C.gold,
        cursor: "pointer",
        textDecoration: "underline",
        textDecorationStyle: "dotted",
        textUnderlineOffset: 2,
      }}
    >{label}</a>
  );
}

// --- Recently Viewed: stored in localStorage ---
function useRecentlyViewed() {
  const [recent, setRecent] = useState(() => lsGet("worldRecent", []));
  useEffect(() => { lsSet("worldRecent", recent); }, [recent]);
  const visit = (kind, id) => {
    setRecent(prev => {
      const filtered = prev.filter(r => !(r.kind === kind && r.id === id));
      return [{ kind, id, ts: Date.now() }, ...filtered].slice(0, 8);
    });
  };
  return [recent, visit];
}

// --- Search index: built once, used everywhere ---
function buildSearchIndex() {
  const idx = [];
  for (const loc of world.locations || []) {
    idx.push({
      kind: "location", id: loc.id, name: loc.name,
      type: loc.type, region: loc.region,
      blob: [loc.name, loc.alt_names?.join(" "), loc.summary, loc.description, loc.tags?.join(" "), loc.region].filter(Boolean).join(" ").toLowerCase()
    });
  }
  for (const npc of world.npcs || []) {
    idx.push({
      kind: "npc", id: npc.id, name: npc.name,
      type: npc.race, region: npc.current_location,
      blob: [npc.name, npc.alt_names?.join(" "), npc.race, npc.occupation, npc.physical_description, npc.personality, npc.tags?.join(" ")].filter(Boolean).join(" ").toLowerCase()
    });
  }
  for (const f of world.factions || []) {
    idx.push({
      kind: "faction", id: f.id, name: f.name,
      type: f.type, region: f.scope,
      blob: [f.name, f.alignment, f.scope, f.methods, f.current_state, f.tags?.join(" ")].filter(Boolean).join(" ").toLowerCase()
    });
  }
  for (const e of world.events || []) {
    idx.push({
      kind: "event", id: e.id, name: e.title,
      type: e.type, region: e.in_world_date,
      blob: [e.title, e.description, e.tags?.join(" "), e.in_world_date].filter(Boolean).join(" ").toLowerCase()
    });
  }
  return idx;
}

// ============================================================================
// World root: handles internal sub-tab routing
// ============================================================================
function WorldPage() {
  const [view, setView] = useState(() => lsGet("worldView", "map"));
  const [selectedKind, setSelectedKind] = useState(() => lsGet("worldSelectedKind", null));
  const [selectedId, setSelectedId] = useState(() => lsGet("worldSelectedId", null));
  const [layerVisibility, setLayerVisibility] = useState(() => lsGet("worldLayers", {}));
  const [recent, visit] = useRecentlyViewed();

  useEffect(() => { lsSet("worldView", view); }, [view]);
  useEffect(() => { lsSet("worldSelectedKind", selectedKind); }, [selectedKind]);
  useEffect(() => { lsSet("worldSelectedId", selectedId); }, [selectedId]);
  useEffect(() => { lsSet("worldLayers", layerVisibility); }, [layerVisibility]);

  // Navigate to an entity's detail view
  const navTo = (kind, id) => {
    visit(kind, id);
    setSelectedKind(kind);
    setSelectedId(id);
    if (kind === "location") setView("locations");
    else if (kind === "npc") setView("npcs");
    else if (kind === "faction") setView("factions");
    else if (kind === "event") setView("timeline");
  };

  const subTabs = [
    { id: "map", label: "Map", icon: "⌖" },
    { id: "locations", label: "Locations", icon: "◇" },
    { id: "npcs", label: "NPCs", icon: "✦" },
    { id: "factions", label: "Factions", icon: "❖" },
    { id: "timeline", label: "Timeline", icon: "❡" },
    { id: "search", label: "Search", icon: "⚲" },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Sub-nav for the World section */}
      <div style={{
        background: C.bg,
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "stretch",
        flexShrink: 0,
        overflowX: "auto",
      }}>
        {subTabs.map(t => {
          const active = view === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setView(t.id); setSelectedId(null); setSelectedKind(null); }}
              style={{
                background: active ? C.panel : "transparent",
                border: "none",
                borderBottom: active ? `2px solid ${C.gold}` : "2px solid transparent",
                color: active ? C.goldBright : C.textDim,
                padding: "8px 14px",
                cursor: "pointer",
                fontFamily: fonts.display,
                fontSize: 11,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: 11 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        {/* Recently viewed quick access */}
        {recent.length > 0 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 12px",
            borderLeft: `1px solid ${C.border}`,
          }}>
            <span style={{
              fontFamily: fonts.display, fontSize: 9, letterSpacing: "0.1em",
              color: C.textDim, textTransform: "uppercase",
            }}>Recent</span>
            {recent.slice(0, 4).map((r, i) => (
              <button
                key={i}
                onClick={() => navTo(r.kind, r.id)}
                style={{
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  color: C.textMute,
                  padding: "3px 8px",
                  fontSize: 10,
                  fontFamily: fonts.body,
                  cursor: "pointer",
                  borderRadius: 2,
                  whiteSpace: "nowrap",
                  maxWidth: 130,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={`${r.kind}: ${worldEntityLabel(r.kind, r.id)}`}
              >{worldEntityLabel(r.kind, r.id)}</button>
            ))}
          </div>
        )}
      </div>

      {/* Active view */}
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        {view === "map" && <WorldMap onNav={navTo} layerVisibility={layerVisibility} setLayerVisibility={setLayerVisibility} />}
        {view === "locations" && <LocationsView selectedId={selectedId} onSelect={(id) => { setSelectedId(id); if (id) visit("location", id); }} onNav={navTo} />}
        {view === "npcs" && <NpcsView selectedId={selectedId} onSelect={(id) => { setSelectedId(id); if (id) visit("npc", id); }} onNav={navTo} />}
        {view === "factions" && <FactionsView selectedId={selectedId} onSelect={(id) => { setSelectedId(id); if (id) visit("faction", id); }} onNav={navTo} />}
        {view === "timeline" && <TimelineView onNav={navTo} />}
        {view === "search" && <SearchView onNav={navTo} />}
      </div>
    </div>
  );
}

// ============================================================================
// Map view — Leaflet, loaded via window.L (CDN in index.html)
// ============================================================================
function WorldMap({ onNav, layerVisibility, setLayerVisibility }) {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!window.L) {
      // Leaflet not loaded yet
      const interval = setInterval(() => {
        if (window.L) { clearInterval(interval); setMapReady(true); }
      }, 100);
      return () => clearInterval(interval);
    }
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (!mapReady || !window.L) return;
    const L = window.L;
    const meta = world.world_meta;
    const [w, h] = meta.world_map_bounds_px || [4096, 4096];

    const container = document.getElementById("world-map-container");
    if (!container) return;
    container.innerHTML = "";

    const map = L.map(container, {
      crs: L.CRS.Simple,
      minZoom: -3,
      maxZoom: 2,
      zoomControl: true,
      attributionControl: false,
    });

    const bounds = [[0, 0], [h, w]];

    // Try to load the map image; on failure, render a placeholder grid
    const img = new Image();
    img.onload = () => {
      L.imageOverlay(meta.world_map_image, bounds).addTo(map);
      map.fitBounds(bounds);
    };
    img.onerror = () => {
      // No map yet — show parchment placeholder
      const placeholder = L.layerGroup();
      // grid rectangle
      L.rectangle(bounds, { color: C.border, weight: 2, fillColor: C.panelMute, fillOpacity: 1 }).addTo(placeholder);
      // Grid lines for orientation
      for (let x = 0; x <= w; x += 512) {
        L.polyline([[0, x], [h, x]], { color: C.border, weight: 1, opacity: 0.3 }).addTo(placeholder);
      }
      for (let y = 0; y <= h; y += 512) {
        L.polyline([[y, 0], [y, w]], { color: C.border, weight: 1, opacity: 0.3 }).addTo(placeholder);
      }
      placeholder.addTo(map);
      map.fitBounds(bounds);
      // Add a "no map yet" notice
      const notice = L.popup({ closeButton: false, autoClose: false, closeOnClick: false })
        .setLatLng([h / 2, w / 2])
        .setContent('<div style="font-family: ' + fonts.body + '; color: ' + C.textMute + '; padding: 4px 8px;">No world map image yet — using grid placeholder. Upload <code>world-map.png</code> to deploy.</div>');
      notice.openOn(map);
    };
    img.src = meta.world_map_image;

    // Custom icon for each marker — using SVG for crisp rendering
    const makeIcon = (typeIcon, isDmOnly) => L.divIcon({
      className: "world-marker",
      html: `<div style="
        background: ${isDmOnly ? C.secretBg : C.panel};
        border: 1.5px solid ${isDmOnly ? C.secret : C.gold};
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: ${fonts.display};
        font-size: 13px;
        color: ${isDmOnly ? C.secret : C.goldBright};
        box-shadow: 0 2px 4px rgba(0,0,0,0.5);
      ">${typeIcon}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    // Place markers, respecting layer visibility
    const typeLookup = {};
    (world.location_types || []).forEach(t => { typeLookup[t.id] = t; });

    (world.locations || []).forEach(loc => {
      if (!loc.coords) return;
      const typeInfo = typeLookup[loc.type] || { icon: "•", default_visible: true };
      const visible = layerVisibility[loc.type] !== undefined ? layerVisibility[loc.type] : typeInfo.default_visible;
      if (!visible) return;
      const [x, y] = loc.coords;
      const marker = L.marker([h - y, x], { icon: makeIcon(typeInfo.icon, typeInfo.dm_only) }).addTo(map);
      const popupHtml = `
        <div style="font-family: ${fonts.body}; color: ${C.text}; padding: 4px; min-width: 180px;">
          <div style="font-family: ${fonts.display}; font-size: 14px; color: ${C.goldBright}; letter-spacing: 0.04em; margin-bottom: 4px;">${loc.name}</div>
          <div style="font-size: 11px; color: ${C.textDim}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">${typeInfo.label || loc.type} · ${loc.region || ""}</div>
          <div style="font-size: 12px; color: ${C.textMute}; line-height: 1.4; margin-bottom: 8px;">${loc.summary || ""}</div>
          <button data-loc-id="${loc.id}" style="
            background: transparent;
            border: 1px solid ${C.gold};
            color: ${C.gold};
            padding: 4px 10px;
            font-family: ${fonts.display};
            font-size: 10px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            cursor: pointer;
            border-radius: 2px;
          ">Open Profile →</button>
        </div>
      `;
      marker.bindPopup(popupHtml, { autoPan: true });
      marker.on("popupopen", (e) => {
        // Hook the button click since Leaflet popups are detached DOM
        const btn = e.popup.getElement().querySelector('button[data-loc-id]');
        if (btn) {
          btn.onclick = () => onNav("location", loc.id);
        }
      });
    });

    return () => { map.remove(); };
  }, [mapReady, layerVisibility, onNav]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "row" }}>
      {/* Map container */}
      <div style={{ flex: 1, position: "relative", background: C.panelMute }}>
        <div id="world-map-container" style={{ height: "100%", width: "100%", background: C.bg }} />
        {!mapReady && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            color: C.textMute, fontFamily: fonts.body, fontSize: 14,
          }}>
            Loading map…
          </div>
        )}
      </div>
      {/* Layer panel */}
      <div style={{
        width: 220,
        background: C.panelMute,
        borderLeft: `1px solid ${C.border}`,
        padding: "16px 14px",
        overflowY: "auto",
        flexShrink: 0,
      }}>
        <div style={{ marginBottom: 12 }}>
          <Label>Layers</Label>
        </div>
        {(world.location_types || []).map(t => {
          const visible = layerVisibility[t.id] !== undefined ? layerVisibility[t.id] : t.default_visible;
          return (
            <div
              key={t.id}
              onClick={() => setLayerVisibility(prev => ({ ...prev, [t.id]: !visible }))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 4px",
                cursor: "pointer",
                color: visible ? C.text : C.textDim,
                fontFamily: fonts.body,
                fontSize: 13,
              }}
            >
              <div style={{
                width: 14, height: 14,
                border: `1.5px solid ${visible ? (t.dm_only ? C.secret : C.gold) : C.textDim}`,
                background: visible ? (t.dm_only ? C.secret : C.gold) : "transparent",
                borderRadius: 2,
                flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: "bold", color: C.bg,
              }}>{visible ? "✓" : ""}</div>
              <span style={{
                fontFamily: fonts.display, fontSize: 11, color: t.dm_only ? C.secret : "inherit",
              }}>{t.icon}</span>
              <span>{t.label}</span>
            </div>
          );
        })}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <Body size={11} color={C.textDim} mb={0}>
            Click a marker for details. Trade routes and faction territories will be added in a later phase.
          </Body>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Locations: list + detail
// ============================================================================
function LocationsView({ selectedId, onSelect, onNav }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const types = ["all", ...new Set((world.locations || []).map(l => l.type))];
  const filtered = (world.locations || [])
    .filter(l => filter === "all" || l.type === filter)
    .filter(l => !search || l.name.toLowerCase().includes(search.toLowerCase()) || (l.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => a.name.localeCompare(b.name));

  const selected = selectedId ? (world.locations || []).find(l => l.id === selectedId) : null;

  if (selected) {
    return <LocationDetail location={selected} onNav={onNav} onBack={() => onSelect(null)} />;
  }

  return (
    <div style={{ overflowY: "auto", padding: "20px 24px", height: "100%", maxWidth: 800, margin: "0 auto" }}>
      <HeadingDisplay size={24} mb={6}>Locations</HeadingDisplay>
      <Body color={C.textMute} mb={14} size={14}>{filtered.length} {filtered.length === 1 ? "place" : "places"} in the world.</Body>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by name or tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 180,
            background: C.panel, color: C.text,
            border: `1px solid ${C.border}`, borderRadius: 3,
            padding: "6px 10px", fontFamily: fonts.body, fontSize: 13,
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {types.map(t => (
          <FilterButton key={t} active={filter === t} onClick={() => setFilter(t)}>{t}</FilterButton>
        ))}
      </div>

      {filtered.map(loc => (
        <Card key={loc.id} bg={C.panel} mb={8} padding={14} onClick={() => onSelect(loc.id)}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
            <HeadingDisplay size={16} mb={0}>{loc.name}</HeadingDisplay>
            <span style={{
              fontFamily: fonts.display, fontSize: 10, color: C.goldDeep,
              letterSpacing: "0.1em", textTransform: "uppercase",
            }}>{loc.type}</span>
            <span style={{
              fontFamily: fonts.body, fontSize: 11, color: C.textDim,
            }}>· {loc.region || "unknown region"}</span>
          </div>
          <Body size={13} color={C.textMute} mb={0}>{loc.summary}</Body>
          {loc.tags && loc.tags.length > 0 && (
            <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
              {loc.tags.map(t => (
                <span key={t} style={{
                  fontSize: 10, fontFamily: fonts.mono, color: C.textDim,
                  background: C.panelMute, padding: "2px 6px", borderRadius: 2,
                }}>{t}</span>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function LocationDetail({ location, onNav, onBack }) {
  return (
    <div style={{ overflowY: "auto", padding: "20px 24px", height: "100%", maxWidth: 800, margin: "0 auto" }}>
      <button onClick={onBack} style={{
        background: "transparent", border: "none", color: C.textMute,
        fontFamily: fonts.body, fontSize: 13, cursor: "pointer", marginBottom: 8,
        padding: 0,
      }}>← All locations</button>

      <div style={{ marginBottom: 6 }}>
        <Label color={C.goldDeep}>{location.type}{location.region ? ` · ${location.region}` : ""}</Label>
      </div>
      <HeadingDisplay size={28} mb={4}>{location.name}</HeadingDisplay>
      {location.alt_names && location.alt_names.length > 0 && (
        <Body size={13} color={C.textDim} italic mb={12}>
          Also known as: {location.alt_names.join(", ")}
        </Body>
      )}

      {location.summary && (
        <Card bg={C.panel} mb={14} padding={14}>
          <Body size={15} mb={0}>{location.summary}</Body>
        </Card>
      )}

      {location.description && (
        <FieldBlock label="Description">
          <Body size={14} mb={0}>{renderLinkedText(location.description, onNav)}</Body>
        </FieldBlock>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {location.population != null && (
          <Card bg={C.panelMute} padding={12} mb={0}>
            <Label size={9}>Population</Label>
            <Body size={13} mb={0}>{location.population}</Body>
          </Card>
        )}
        {location.government && (
          <Card bg={C.panelMute} padding={12} mb={0}>
            <Label size={9}>Government</Label>
            <Body size={13} mb={0}>{location.government}</Body>
          </Card>
        )}
        {location.demographics && (
          <Card bg={C.panelMute} padding={12} mb={0}>
            <Label size={9}>Demographics</Label>
            <Body size={13} mb={0}>{location.demographics}</Body>
          </Card>
        )}
        {location.defenses && (
          <Card bg={C.panelMute} padding={12} mb={0}>
            <Label size={9}>Defenses</Label>
            <Body size={13} mb={0}>{location.defenses}</Body>
          </Card>
        )}
      </div>

      {location.architecture && (
        <FieldBlock label="Architecture"><Body size={13} mb={0}>{location.architecture}</Body></FieldBlock>
      )}
      {location.sensory && (
        <FieldBlock label="Sights and Sounds"><Body size={13} mb={0} italic>{location.sensory}</Body></FieldBlock>
      )}

      {location.laws && (
        <FieldBlock label="Laws and customs"><Body size={13} mb={0}>{location.laws}</Body></FieldBlock>
      )}

      {location.rumors && location.rumors.length > 0 && (
        <FieldBlock label="Current rumors">
          {location.rumors.map((r, i) => (
            <div key={i} style={{ marginBottom: 8, paddingLeft: 8, borderLeft: `2px solid ${C.warning}55` }}>
              <Body size={13} mb={2} italic>"{r.text}"</Body>
              <span style={{ fontFamily: fonts.mono, fontSize: 11, color: C.textDim }}>
                {r.credibility} · {r.spread}
              </span>
            </div>
          ))}
        </FieldBlock>
      )}

      {location.ongoing_problems && location.ongoing_problems.length > 0 && (
        <FieldBlock label="Ongoing problems">
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            {location.ongoing_problems.map((p, i) => (
              <li key={i} style={{ fontFamily: fonts.body, fontSize: 13, color: C.text, marginBottom: 3 }}>{p}</li>
            ))}
          </ul>
        </FieldBlock>
      )}

      {location.calendar_holidays && location.calendar_holidays.length > 0 && (
        <FieldBlock label="Holidays and events">
          {location.calendar_holidays.map((h, i) => (
            <div key={i} style={{ fontFamily: fonts.body, fontSize: 13, color: C.text, marginBottom: 3 }}>· {h}</div>
          ))}
        </FieldBlock>
      )}

      {location.religion && (
        <FieldBlock label="Religion"><Body size={13} mb={0}>{location.religion}</Body></FieldBlock>
      )}

      {location.hobbies_traditions && (
        <FieldBlock label="Hobbies and traditions"><Body size={13} mb={0}>{location.hobbies_traditions}</Body></FieldBlock>
      )}

      {location.social_clubs && location.social_clubs.length > 0 && (
        <FieldBlock label="Social clubs">
          {location.social_clubs.map((c, i) => (
            <div key={i} style={{ fontFamily: fonts.body, fontSize: 13, color: C.text, marginBottom: 3 }}>· {c}</div>
          ))}
        </FieldBlock>
      )}

      {location.factions_present && location.factions_present.length > 0 && (
        <FieldBlock label="Factions present">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {location.factions_present.map(fid => (
              <WorldLink key={fid} kind="faction" id={fid} onNav={onNav} />
            ))}
          </div>
        </FieldBlock>
      )}

      {location.npcs_resident && location.npcs_resident.length > 0 && (
        <FieldBlock label="Notable NPCs">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {location.npcs_resident.map(nid => (
              <WorldLink key={nid} kind="npc" id={nid} onNav={onNav} />
            ))}
          </div>
        </FieldBlock>
      )}

      {location.shops_services && location.shops_services.length > 0 && (
        <FieldBlock label="Shops and services">
          {location.shops_services.map((s, i) => (
            <Card key={i} bg={C.panelMute} mb={8} padding={12}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: fonts.display, fontSize: 13, color: C.goldBright }}>{s.name}</span>
                <span style={{ fontFamily: fonts.mono, fontSize: 11, color: C.textDim }}>{s.type}</span>
              </div>
              {s.description && <Body size={12} mb={6}>{s.description}</Body>}
              {s.owner_npc && <Body size={12} color={C.textMute} mb={4}>Run by <WorldLink kind="npc" id={s.owner_npc} onNav={onNav} /></Body>}
              {s.menu_or_inventory && s.menu_or_inventory.length > 0 && (
                <ul style={{ paddingLeft: 18, margin: "6px 0 0" }}>
                  {s.menu_or_inventory.map((item, j) => (
                    <li key={j} style={{ fontFamily: fonts.body, fontSize: 12, color: C.textMute, marginBottom: 2 }}>
                      {item.item} <span style={{ color: C.gold }}>— {item.price}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </FieldBlock>
      )}

      {location.tags && location.tags.length > 0 && (
        <FieldBlock label="Tags">
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {location.tags.map(t => (
              <span key={t} style={{
                fontSize: 10, fontFamily: fonts.mono, color: C.textDim,
                background: C.panelMute, padding: "3px 8px", borderRadius: 2,
              }}>{t}</span>
            ))}
          </div>
        </FieldBlock>
      )}

      {location.dm_notes && (
        <SecretBox label="🔒 DM notes">{location.dm_notes}</SecretBox>
      )}
    </div>
  );
}

function FieldBlock({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 6 }}><Label>{label}</Label></div>
      {children}
    </div>
  );
}

// ============================================================================
// NPCs: list + detail
// ============================================================================
function NpcsView({ selectedId, onSelect, onNav }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const allTags = [...new Set((world.npcs || []).flatMap(n => n.tags || []))].sort();
  const filtered = (world.npcs || [])
    .filter(n => filter === "all" || (n.tags || []).includes(filter))
    .filter(n => !search || n.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const selected = selectedId ? (world.npcs || []).find(n => n.id === selectedId) : null;
  if (selected) return <NpcDetail npc={selected} onNav={onNav} onBack={() => onSelect(null)} />;

  return (
    <div style={{ overflowY: "auto", padding: "20px 24px", height: "100%", maxWidth: 800, margin: "0 auto" }}>
      <HeadingDisplay size={24} mb={6}>NPCs</HeadingDisplay>
      <Body color={C.textMute} mb={14} size={14}>{filtered.length} characters in the world.</Body>

      <input
        type="text"
        placeholder="Search by name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%", boxSizing: "border-box",
          background: C.panel, color: C.text,
          border: `1px solid ${C.border}`, borderRadius: 3,
          padding: "6px 10px", fontFamily: fonts.body, fontSize: 13,
          marginBottom: 12,
        }}
      />

      {allTags.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>all</FilterButton>
          {allTags.map(t => (
            <FilterButton key={t} active={filter === t} onClick={() => setFilter(t)}>{t}</FilterButton>
          ))}
        </div>
      )}

      {filtered.map(npc => (
        <Card key={npc.id} bg={C.panel} mb={8} padding={14} onClick={() => onSelect(npc.id)}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
            <HeadingDisplay size={16} mb={0}>{npc.name}</HeadingDisplay>
            <span style={{
              fontFamily: fonts.body, fontSize: 12, color: C.textDim,
            }}>{npc.race || ""}{npc.occupation ? ` · ${npc.occupation}` : ""}</span>
          </div>
          <Body size={12} color={C.textMute} mb={4}>{npc.current_status}</Body>
          {npc.tags && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
              {(npc.tags || []).slice(0, 4).map(t => (
                <span key={t} style={{
                  fontSize: 10, fontFamily: fonts.mono, color: C.textDim,
                  background: C.panelMute, padding: "2px 6px", borderRadius: 2,
                }}>{t}</span>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function NpcDetail({ npc, onNav, onBack }) {
  return (
    <div style={{ overflowY: "auto", padding: "20px 24px", height: "100%", maxWidth: 800, margin: "0 auto" }}>
      <button onClick={onBack} style={{
        background: "transparent", border: "none", color: C.textMute,
        fontFamily: fonts.body, fontSize: 13, cursor: "pointer", marginBottom: 8,
        padding: 0,
      }}>← All NPCs</button>

      <div style={{ marginBottom: 6 }}>
        <Label color={C.goldDeep}>{npc.race || "unknown race"}{npc.occupation ? ` · ${npc.occupation}` : ""}</Label>
      </div>
      <HeadingDisplay size={28} mb={4}>{npc.name}</HeadingDisplay>
      {npc.alt_names && npc.alt_names.length > 0 && (
        <Body size={13} color={C.textDim} italic mb={4}>Also known as: {npc.alt_names.join(", ")}</Body>
      )}
      <Body size={14} color={C.warning} mb={14}>{npc.current_status}</Body>

      {npc.physical_description && (
        <FieldBlock label="Physical description"><Body size={14} mb={0}>{npc.physical_description}</Body></FieldBlock>
      )}
      {npc.voice_notes && (
        <FieldBlock label="Voice"><Body size={13} mb={0} italic>{npc.voice_notes}</Body></FieldBlock>
      )}
      {npc.mannerisms && (
        <FieldBlock label="Mannerisms"><Body size={13} mb={0}>{npc.mannerisms}</Body></FieldBlock>
      )}
      {npc.personality && (
        <FieldBlock label="Personality"><Body size={13} mb={0}>{npc.personality}</Body></FieldBlock>
      )}

      {(npc.wants || npc.fears) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {npc.wants && (
            <Card bg={C.panelMute} padding={12} mb={0}>
              <Label size={9}>Wants</Label>
              <Body size={13} mb={0}>{npc.wants}</Body>
            </Card>
          )}
          {npc.fears && (
            <Card bg={C.panelMute} padding={12} mb={0}>
              <Label size={9}>Fears</Label>
              <Body size={13} mb={0}>{npc.fears}</Body>
            </Card>
          )}
        </div>
      )}

      {npc.would_die_for && (
        <FieldBlock label="Would die for"><Body size={13} mb={0}>{npc.would_die_for}</Body></FieldBlock>
      )}

      {npc.current_location && (
        <FieldBlock label="Currently at">
          <WorldLink kind="location" id={npc.current_location} onNav={onNav} />
        </FieldBlock>
      )}

      {npc.relationships && npc.relationships.length > 0 && (
        <FieldBlock label="Relationships">
          {npc.relationships.map((rel, i) => (
            <Card key={i} bg={C.panelMute} mb={6} padding={10}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <WorldLink kind="npc" id={rel.npc_id} onNav={onNav} />
                <span style={{ fontFamily: fonts.body, fontSize: 12, color: C.textDim }}>
                  {rel.type}{rel.strength ? ` · ${rel.strength}` : ""}
                </span>
              </div>
              {rel.notes && <Body size={12} color={C.textMute} mb={0}>{rel.notes}</Body>}
            </Card>
          ))}
        </FieldBlock>
      )}

      {npc.factions && npc.factions.length > 0 && (
        <FieldBlock label="Factions">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {npc.factions.map(fid => (
              <WorldLink key={fid} kind="faction" id={fid} onNav={onNav} />
            ))}
          </div>
        </FieldBlock>
      )}

      {npc.tags && npc.tags.length > 0 && (
        <FieldBlock label="Tags">
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {npc.tags.map(t => (
              <span key={t} style={{
                fontSize: 10, fontFamily: fonts.mono, color: C.textDim,
                background: C.panelMute, padding: "3px 8px", borderRadius: 2,
              }}>{t}</span>
            ))}
          </div>
        </FieldBlock>
      )}

      {(npc.first_introduced || npc.last_seen_by_party) && (
        <FieldBlock label="History with the party">
          {npc.first_introduced && <Body size={12} mb={2} color={C.textMute}>First seen: {npc.first_introduced}</Body>}
          {npc.last_seen_by_party && <Body size={12} mb={0} color={C.textMute}>Last seen: {npc.last_seen_by_party}</Body>}
        </FieldBlock>
      )}

      {npc.secret_belief && (
        <SecretBox label="🔒 Secret belief">{npc.secret_belief}</SecretBox>
      )}
      {npc.secret_knowledge && (
        <SecretBox label="🔒 Secret knowledge">{npc.secret_knowledge}</SecretBox>
      )}
      {npc.dm_notes && (
        <SecretBox label="🔒 DM notes">{npc.dm_notes}</SecretBox>
      )}
    </div>
  );
}

// ============================================================================
// Factions: list + detail
// ============================================================================
function FactionsView({ selectedId, onSelect, onNav }) {
  const filtered = (world.factions || []).sort((a, b) => a.name.localeCompare(b.name));
  const selected = selectedId ? (world.factions || []).find(f => f.id === selectedId) : null;

  if (selected) return <FactionDetail faction={selected} onNav={onNav} onBack={() => onSelect(null)} />;

  return (
    <div style={{ overflowY: "auto", padding: "20px 24px", height: "100%", maxWidth: 800, margin: "0 auto" }}>
      <HeadingDisplay size={24} mb={6}>Factions</HeadingDisplay>
      <Body color={C.textMute} mb={16} size={14}>{filtered.length} organizations operating in the world.</Body>

      {filtered.map(f => (
        <Card key={f.id} bg={C.panel} mb={8} padding={14} onClick={() => onSelect(f.id)}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
            <HeadingDisplay size={16} mb={0}>{f.name}</HeadingDisplay>
            <span style={{
              fontFamily: fonts.display, fontSize: 10,
              color: f.alignment === "evil" ? C.secret : f.alignment === "good" ? C.success : C.textDim,
              letterSpacing: "0.1em", textTransform: "uppercase",
            }}>{f.alignment}</span>
            <span style={{ fontFamily: fonts.body, fontSize: 11, color: C.textDim }}>· {f.scope}</span>
          </div>
          {f.current_state && <Body size={12} color={C.textMute} mb={0}>{f.current_state}</Body>}
        </Card>
      ))}
    </div>
  );
}

function FactionDetail({ faction, onNav, onBack }) {
  return (
    <div style={{ overflowY: "auto", padding: "20px 24px", height: "100%", maxWidth: 800, margin: "0 auto" }}>
      <button onClick={onBack} style={{
        background: "transparent", border: "none", color: C.textMute,
        fontFamily: fonts.body, fontSize: 13, cursor: "pointer", marginBottom: 8,
        padding: 0,
      }}>← All factions</button>

      <div style={{ marginBottom: 6 }}>
        <Label color={C.goldDeep}>{faction.type} · {faction.scope}</Label>
      </div>
      <HeadingDisplay size={28} mb={6}>{faction.name}</HeadingDisplay>
      <span style={{
        fontFamily: fonts.display, fontSize: 11,
        color: faction.alignment === "evil" ? C.secret : faction.alignment === "good" ? C.success : C.textDim,
        letterSpacing: "0.12em", textTransform: "uppercase",
        background: C.panelMute, padding: "3px 8px", borderRadius: 2,
        display: "inline-block", marginBottom: 14,
      }}>{faction.alignment}</span>

      {faction.current_state && (
        <FieldBlock label="Current state"><Body size={14} mb={0}>{faction.current_state}</Body></FieldBlock>
      )}

      {faction.leader_npc && (
        <FieldBlock label="Leader">
          <WorldLink kind="npc" id={faction.leader_npc} onNav={onNav} />
        </FieldBlock>
      )}

      {faction.goals && faction.goals.length > 0 && (
        <FieldBlock label="Goals">
          {faction.goals.map((g, i) => (
            <div key={i} style={{ marginBottom: 6, paddingLeft: 8, borderLeft: `2px solid ${g.priority === "primary" ? C.gold : C.border}` }}>
              <Body size={13} mb={0}>{g.goal}</Body>
              <span style={{ fontFamily: fonts.mono, fontSize: 10, color: C.textDim, textTransform: "uppercase" }}>{g.priority}</span>
            </div>
          ))}
        </FieldBlock>
      )}

      {faction.methods && (
        <FieldBlock label="Methods"><Body size={13} mb={0}>{faction.methods}</Body></FieldBlock>
      )}

      {faction.base_of_operations && (
        <FieldBlock label="Base of operations">
          <WorldLink kind="location" id={faction.base_of_operations} onNav={onNav} />
        </FieldBlock>
      )}

      {faction.members && faction.members.length > 0 && (
        <FieldBlock label="Members">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {faction.members.map(nid => (
              <WorldLink key={nid} kind="npc" id={nid} onNav={onNav} />
            ))}
          </div>
        </FieldBlock>
      )}

      {faction.recent_actions && faction.recent_actions.length > 0 && (
        <FieldBlock label="Recent actions">
          {faction.recent_actions.map((a, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <span style={{ fontFamily: fonts.mono, fontSize: 11, color: C.gold }}>{a.date}</span>
              <Body size={13} mb={0}>{a.action}</Body>
            </div>
          ))}
        </FieldBlock>
      )}

      {faction.known_to_party && (
        <FieldBlock label="Known to the party"><Body size={13} mb={0}>{faction.known_to_party}</Body></FieldBlock>
      )}

      {faction.tags && faction.tags.length > 0 && (
        <FieldBlock label="Tags">
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {faction.tags.map(t => (
              <span key={t} style={{
                fontSize: 10, fontFamily: fonts.mono, color: C.textDim,
                background: C.panelMute, padding: "3px 8px", borderRadius: 2,
              }}>{t}</span>
            ))}
          </div>
        </FieldBlock>
      )}

      {faction.dm_notes && (
        <SecretBox label="🔒 DM notes">{faction.dm_notes}</SecretBox>
      )}
    </div>
  );
}

// ============================================================================
// Timeline
// ============================================================================
function TimelineView({ onNav }) {
  const events = [...(world.events || [])];
  return (
    <div style={{ overflowY: "auto", padding: "20px 24px", height: "100%", maxWidth: 800, margin: "0 auto" }}>
      <HeadingDisplay size={24} mb={6}>Timeline</HeadingDisplay>
      <Body color={C.textMute} mb={20} size={14}>{events.length} recorded events.</Body>

      {events.map(evt => (
        <Card key={evt.id} bg={C.panel} mb={10} padding={14}>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontFamily: fonts.mono, fontSize: 11, color: C.gold }}>{evt.in_world_date}</span>
            {evt.real_world_session && (
              <span style={{ fontFamily: fonts.mono, fontSize: 10, color: C.textDim, marginLeft: 8 }}>
                ({evt.real_world_session})
              </span>
            )}
          </div>
          <HeadingDisplay size={15} mb={4}>{evt.title}</HeadingDisplay>
          <Body size={13} mb={evt.actors || evt.locations ? 8 : 0}>{evt.description}</Body>

          {evt.actors && evt.actors.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontFamily: fonts.display, fontSize: 9, color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginRight: 8 }}>Actors:</span>
              {evt.actors.map((id, i) => (
                <span key={id}>
                  <WorldLink kind="npc" id={id} onNav={onNav} />
                  {i < evt.actors.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          )}
          {evt.locations && evt.locations.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontFamily: fonts.display, fontSize: 9, color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginRight: 8 }}>Locations:</span>
              {evt.locations.map((id, i) => (
                <span key={id}>
                  <WorldLink kind="location" id={id} onNav={onNav} />
                  {i < evt.locations.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          )}
          {evt.factions && evt.factions.length > 0 && (
            <div>
              <span style={{ fontFamily: fonts.display, fontSize: 9, color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginRight: 8 }}>Factions:</span>
              {evt.factions.map((id, i) => (
                <span key={id}>
                  <WorldLink kind="faction" id={id} onNav={onNav} />
                  {i < evt.factions.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          )}
          {evt.known_to_party === false && (
            <div style={{ marginTop: 6 }}>
              <span style={{
                fontFamily: fonts.mono, fontSize: 10, color: C.secret,
                background: C.secretBg, padding: "2px 6px", borderRadius: 2,
              }}>Off-screen / DM only</span>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// Search — universal across all world entities
// ============================================================================
function SearchView({ onNav }) {
  const [query, setQuery] = useState("");
  const index = buildSearchIndex();
  const q = query.trim().toLowerCase();
  const results = q.length === 0 ? [] : index.filter(item => item.blob.includes(q));

  const grouped = {
    location: results.filter(r => r.kind === "location"),
    npc: results.filter(r => r.kind === "npc"),
    faction: results.filter(r => r.kind === "faction"),
    event: results.filter(r => r.kind === "event"),
  };

  return (
    <div style={{ overflowY: "auto", padding: "20px 24px", height: "100%", maxWidth: 800, margin: "0 auto" }}>
      <HeadingDisplay size={24} mb={6}>Search the world</HeadingDisplay>
      <Body color={C.textMute} mb={14} size={14}>Find anything by name, tag, or description.</Body>

      <input
        type="text"
        placeholder="Type to search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        style={{
          width: "100%", boxSizing: "border-box",
          background: C.panel, color: C.text,
          border: `1px solid ${C.gold}`, borderRadius: 3,
          padding: "10px 14px", fontFamily: fonts.body, fontSize: 15,
          marginBottom: 16,
        }}
      />

      {q.length > 0 && results.length === 0 && (
        <Body color={C.textMute} mb={0}>No results for "{query}".</Body>
      )}

      {Object.entries(grouped).map(([kind, items]) => {
        if (!items.length) return null;
        const label = kind === "location" ? "Locations" : kind === "npc" ? "NPCs" : kind === "faction" ? "Factions" : "Events";
        return (
          <div key={kind} style={{ marginBottom: 18 }}>
            <div style={{ marginBottom: 8 }}>
              <Label>{label} ({items.length})</Label>
            </div>
            {items.map(item => (
              <Card key={`${item.kind}-${item.id}`} bg={C.panel} mb={6} padding={10} onClick={() => onNav(item.kind, item.id)}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: fonts.display, fontSize: 14, color: C.goldBright }}>{item.name}</span>
                  {item.type && <span style={{ fontFamily: fonts.mono, fontSize: 10, color: C.textDim }}>{item.type}</span>}
                  {item.region && <span style={{ fontFamily: fonts.body, fontSize: 11, color: C.textDim }}>· {item.region}</span>}
                </div>
              </Card>
            ))}
          </div>
        );
      })}
    </div>
  );
}


function TopNav({ page, onNav }) {
  const tabs = [
    { id: "overview", label: "Overview", icon: "◆" },
    { id: "scenes", label: "Scenes", icon: "▸" },
    { id: "npcs", label: "NPCs", icon: "✦" },
    { id: "skills", label: "Skills", icon: "◇" },
    { id: "scenery", label: "Scenery", icon: "❡" },
    { id: "tracker", label: "Tracker", icon: "✓" },
    { id: "world", label: "World", icon: "✺" },
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
      <div style={{ flex: 1, overflow: "hidden", position: "relative", minHeight: 0 }}>
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
        {page === "world" && <WorldPage />}
      </div>
    </div>
  );
}
