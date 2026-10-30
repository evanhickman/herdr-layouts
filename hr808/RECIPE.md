# HR-808

Herdr dressed as a Roland TR-808 drum machine, on the gruvbox palette. Tabs are the 808's colored step keys with step numbers printed under them. Agent status shows on dark-glass LEDs throughout. Spaces and agents read like the panel's printed labels, and a gray strip runs along the bottom like the 808's step panel. Underneath it's Herdr's own layout, so nothing in the usual workflow moves. Clicking the "Agent Composer" print turns the tab bar into a working 16-step drum machine, an easter egg. It's a fan homage to the TR-808 and isn't affiliated with Roland.

![HR-808](preview.png)

## What you see

The window is a row. Black chassis edges (8px, a `#0a0a0a`→`#202020` gradient at 90°) frame a near-black chassis (`canvas`, 1px `#000000` border). The chassis splits into a sidebar on the left and the work area on the right, divided by a 1px `dim` rule. The system title bar is hidden, and the macOS window buttons sit at `[20, 10]`.

**Theme** (`themes/hr808.json`, installed into the home's `themes/` alongside the layout, which names it): gruvbox dark hard (terminal background `#1d2021`, foreground `#ebdbb2`, gruvbox ANSI), with these overrides:
- canvas and chrome `#161616`, raised `#32302f`, hover `#3c3836`, selected `#504945`, border `#3c3836`, input `#665c54`
- muted `#bdae93`, dim `#7c6f64`
- accent `#fe8019` (the 808's orange print)
- working `#fe8019`, blocked `#fb4934`, done `#fabd2f`, idle `#665c54`

UI font Helvetica Neue; the print is Futura. Lettering on colored keys and the gray strip is ink `#111111`.

**Sidebar** (268px, collapses to 44px), top to bottom:
- **Brand row** (46px):
  - "Herdr" in Futura bold 21px orange, then a 1px orange rule out to the search and sidebar-toggle buttons (26px).
  - Everything sits 4px from the top on a 26px line, the same line as the tab keys, so this rule and the tab bar's rule read as one continuous printed line across the window.
- **Spaces:**
  - **Heading:** "SPACES" in a 16px box with a cream 1px outline (9px semibold, like the 808's INSTRUMENT-SELECT), a 1px `dim` rule, and a drawn + to make a space.
  - **Rows:** each row starts with an LED, then for top-level spaces an 18px step key in the space's color with its initial in ink, then the name in cream.
  - **Key colors:** the space's color at gruvbox's bright step: aqua, yellow, blue, pink, green or red.
  - **Worktrees:** indented 40px under their repo, joined to the repo's key by thin `dim` bracket lines (└ for the last one, ├ above it).
  - **PR labels** (right edge, 16px tall, radius 2):
    - Beige (`#ebdbb2`) while open; tan (`#bdae93`) once merged, closed, a draft, or unreadable.
    - Inside: a checks LED (red failing, yellow running, green passing), the PR number, then a 10px review mark: ✓ approved, ✗ changes requested, ○ review required, nothing when there's no review yet.
- **Divider:** a 1px `dim` rule with 17 tick marks, 4px tall, like the 808's channel dividers.
- **Agents:**
  - **Heading:** a boxed "AGENTS", a rule, and the sort button.
  - **Section headings** in 9.5px semibold capitals in their status color: NEEDS YOU, WORKING, DONE, IDLE (priority sort), or space names (grouped sort).
  - **Rows:** an LED, the agent's space key, the name (idle agents in `muted`), and the time since it changed.
  - **Sub-agents** hang off tree lines, with their program icon as a one-color `muted` glyph.
- **Footer** (28px): the left end of the gray strip, holding SETTINGS (a cream LED when an update waits) and ADD MACHINE as boxed 18px ink labels.

**Work area:**
- **Tab bar** (46px):
  - **Tab keys:** one per tab, 26px tall, 60–220px wide, radius 3, in fours by position: red `#fb4934`, orange `#fe8019`, yellow `#fabd2f`, cream `#ebdbb2`, then repeating.
  - **On each key:** an LED and the tab name in ink 12.5px. The shown tab is semibold with a × to close it.
  - **Under each key:** its step number (10px). The shown tab's number sits on a 2px cream bar.
  - **After the keys:** a cream + key (30×26), then a 1px orange rule that fills to "Agent Composer" (Futura italic 17px orange) and "HR-808" (Futura 12px).
  - **Right end:** Files and Changes switches (26px, outlined): a hollow ring when closed, a cream LED in a black socket when open.
- **Panes:** cards with radius 3, 8px gaps, a 1px `border` edge, and a 1px orange edge on the focused one.
  - **Header** (28px): a label (18px, radius 2) holding the status LED and the program name in 808 lettering. The lettering keeps capitals and each word's first letter full size and sets the rest as smaller capitals, as in "BassDrum".
  - **Label style:** solid cream while the pane is focused, outlined otherwise.
  - **After the label:** the folder in `muted`, and on hover the split right, split down, zoom and close buttons.
- **Files / Changes panel:** a 368px panel on the right, hidden until opened.
- **Status strip** (28px, gruvbox gray `#a89984`, ink 11.5px):
  - the machine and branch
  - LED meters: "N working", "N need you" ("1 needs you"), "N done", "N idle"
  - at the right, a boxed "⌘ SHIFT P COMMANDS"

**Pattern mode** (the easter egg, opened by clicking the print): the tab bar becomes a step sequencer.
- **Left:** six instrument keys, BD SD CP CH OH CB (bass drum, snare, clap, closed and open hi-hat, cow bell). The selected one is solid cream, the others outlined.
- **The 16 step keys** in the tab keys' red, orange, yellow and cream fours, numbered 1–16 underneath. A step that plays for the selected instrument has a round red LED (`t.blocked`) in a black socket. The playhead outlines its key in cream and lights its number.
- **START/STOP:** a cream key, 72px wide whatever it says, with a round red LED lit while playing. Until the sound engine is ready it reads LOADING, dimmed, does nothing, and its tooltip says "The sound engine is starting".
- **Tempo:** a 68px box reading "112 BPM".
- **The print** reads "Rhythm Composer HR-808" while pattern mode is open, with the tooltip "Back to tabs" ("Rhythm composer" on the tabs). The + key, the orange rule and the Files/Changes switches are hidden to give the steps room.
- **Hover:** each instrument key names its instrument ("Bass drum" … "Cow bell"), and the tempo box says "Scroll to change the tempo".

**Status LEDs** (tab keys, pane labels, space and agent rows, the status strip) are the same everywhere:
- **Lit:** a 12px black socket holding an 8px mark. Working is an orange dot, blocked a red square, done a yellow ring (1.5px).
- **Off:** a 6px dark-red glass dot (`#3a1611`) in the same 12px space.

**Indicator LEDs** are smaller, a 10px black socket holding a 6px dot: the PR checks LED, the waiting-update LED on SETTINGS, and the Files/Changes switches.

## How it behaves

- **Agent status:**
  - **working:** an orange dot.
  - **blocked:** a red square, plus a red "Needs you" label on the agent's row (or a NEEDS YOU section when sorted by priority).
  - **done:** a yellow ring.
  - **idle:** dark glass, with the agent's name dimmed.
  - A space's LED shows its most urgent agent. Hovering it names the agent and state.
- **Nothing animates:** working and blocked can last for hours, so the LEDs hold steady instead of blinking or spinning.
- **Tab keys:**
  - Click selects the tab, drag reorders, double-click renames, and right-click opens the tab menu.
  - Scrolling over the bar steps through tabs.
  - The numbers are the `cmd-1`…`cmd-9` shortcuts. They count only tabs that aren't settled (put away), as `tab.select` does, and a settled tab has no number. The keys scroll when there are more than fit.
- **+ key:** opens the new-tab menu (a terminal or any installed agent).
- **Files / Changes:** each switch toggles its panel. The open panel is remembered per space.
- **Spaces:**
  - Click selects, drag reorders (worktrees among their repo's), and right-click opens the space menu.
  - Clicking a PR label opens the PR.
  - Rows have a faint cream outline on hover and a solid cream outline when selected, with a pointer cursor.
- **Agents:**
  - Click focuses the agent's pane. Hover shows a pin button, and pinned agents stay at the top.
  - Sub-agents fold under their parent; clicking one peeks at it.
  - The sort button switches between priority and grouped by space.
- **Collapsed sidebar** (the toggle in the brand row; `cmd-b` hides the sidebar entirely):
  - Spaces and agents become 20px step keys printed with their position number (the space number matches `ctrl-1`…`ctrl-9`).
  - The LED sits on the key's corner while something is going on, and hovering shows the name.
- **Status strip:** the COMMANDS label opens the palette.
- **Footer:** SETTINGS opens settings and ADD MACHINE opens the machine dialog.
- **Brand row:** search opens the space picker. The brand row and tab bar drag the window.
- **Pattern mode:**
  - **Opening it** saves the six drum sounds the first time (about a second), then starts the sound engine (about 0.2 s). START reads LOADING until the engine answers.
  - **Instrument keys** pick the instrument; **step keys** turn its hits on and off; **START/STOP** plays and stops the loop from step 1.
  - **Edits while playing** land on the first step at least 60 ms ahead (the next step, or the one after at fast tempos), with no restart and no click. **Tempo changes** apply at once.
  - **Scrolling over the tempo** changes it 60–200 BPM, one BPM per 6 px of scroll. Scrolling the bar no longer steps through tabs.
  - **The pattern and tempo are saved** and come back next time.
  - **Clicking the print again** fades the beat out, stops the engine and returns to the tabs.
  - **Sound:** 808-style voices synthesized from oscillators and noise, no samples. A sound that rings out fades over the last 5 ms of its file; one that's cut off (a choke, a retrigger, STOP) fades over the sampler's 8 ms release, so nothing clicks. A closed hi-hat chokes a ringing open one.

## Built from

**Files**, each copied to the same path under the Herdr home (`~/.config/herdr-app`):
- `layouts/hr808.json`, the layout, and `layouts/hr808.svg`, its preview picture in Settings
- `themes/hr808.json`, the theme the layout names
- `mods/hr808/`, `mods/hr808-spaces/`, `mods/hr808-agents/`

**Node tree** (`layouts/hr808.json`):

```
root row (theme hr808, ui_font Helvetica Neue, padding [0,8], gradient, titlebar none, traffic_lights [20,10], terminal_padding [14,12])
└ chassis row (canvas, border 1 #000000, divider 1 dim)
  ├ sidebar column 268px (min 44, max 480, chrome, resizable false)
  │ ├ brand block 46px, window_drag    { mod: hr808, props: { part: "brand" } }
  │ ├ sidebar-lists column
  │ │ ├ spaces block weight 1, min 90  { mod: hr808-spaces }
  │ │ └ agents block weight 1, min 90  { mod: hr808-agents }
  │ └ sidebar-footer block 28px        { mod: hr808, props: { part: "footer" } }
  └ work column (resizable false)
    ├ tabs block 46px, window_drag     { mod: hr808, props: { part: "tabs" } }
    ├ work-body row (padding 8, gap 8)
    │ ├ main block { tab: "active", pane: { header: { content: { mod: hr808 }, height 28, top, always },
    │ │              background "background", border 1 border, focus 1 accent, radius 3, gap 8, lone true } }
    │ └ panel column 368px (min 280, max 900, hidden) → panel-body stack: files, changes (shipped mods)
    └ status block 28px                { mod: hr808, props: { part: "status" } }
```

The ids `sidebar`, `panel`, `panel-body`, `files` and `changes` match the shipped `main` layout, so `cmd-b` and the shipped panel commands still work.

**Mods:**
- **`hr808`:** one mod drawing five parts, plus the sequencer.
  - **How parts are picked:** a layout block names its part in `props.part`. A pane header is recognized by `props().pane`, which Herdr gives it.
  - **The parts:** `tabs.js` (tab keys, + key, rule, print, switches), `brand.js`, `footer.js`, `status.js` and `pane.js` (the pane header).
  - **Shared helpers:** `panel.js` holds `caps()` (the 808 lettering), `led()`/`mark()` and `INK`.
  - **The sequencer:**
    - `seq.js`: the pattern, its tempo, and talking to the engine. Every START, STOP, edit and tempo change writes the whole state, `{rev, bpm, playing, pattern}`, with `writeTextFile` (atomic). A single listener reads the engine's status: `ready`, `ok <epoch ms of beat 0> <bpm>`, `stopped` or `error: …`. The playhead counts steps from the `ok` time.
    - `synth.js`: the six voices made in code, and `wav()`, which saves one voice as a 16-bit mono WAV with a 5 ms end fade.
    - `engine.jxa`: the sound engine, a JavaScript for Automation script run with `osascript`. It's an AVAudioEngine with six AVAudioUnitSamplers and an AVAudioSequencer whose tracks it writes 1.5 bars ahead. It follows the state file's changes, checking every 50 ms while playing and 100 ms while stopped.
  - **Art:** `plus.svg`.
  - **Shipped icons it borrows:** `mods/workspace-chrome/*.svg` and `mods/pane/*.svg`.
- **`hr808-spaces`:** a modified copy of the shipped `spaces` mod (0.1.7) that always draws the 808 look.
  - **Added to the shipped list:**
    - PR track labels from `gh pr view` (`trackLabel`), with the review marks (`circle.svg`, plus the shipped `check.svg` and `x.svg`)
    - `statusLed`, `stepKey` and `compactKey`
    - the bracket lines (a `parent` flag set in `ordered()`)
    - the boxed heading, with its own `plus.svg`
  - **Space colors:** come from shared `space.colors`, the same names the shipped list stores, mapped to the theme's bright ANSI step.
- **`hr808-agents`:** a modified copy of the shipped `agents` mod (0.1.7) with `led()`, `spaceKey()`, the boxed heading, the tick rule, the section headings, cream row edges, numbered collapsed keys and one-color sub-agent glyphs.
- **Shipped mods it uses as they are:** `files`, `changes`, `new-menu`, `menu`, `picker`, `machine-add`.

**`herdr` functions and commands:**
- **Data and overlays:** `spaces()`, `machines()`, `agents()`, `panes()`, `terminals()`, `focused()`, `layout()`, `theme()`, `window()`, `updates()`, `home()`, `props()`, `shared()`/`setShared()`, `setAgentOrder()`, `openOverlay()`/`closeOverlay()`, `notify()`.
- **Programs and files:** `exec()`, `hc()`, `watchFolder()`, `readTextFile()`/`writeTextFile()`, `appHome()`, and `fs/promises` (`mkdir`, `writeFile`, `readdir`, `exists`, `unlink`).
- **Commands:**
  - `tab.select`, `tab.move`, `tab.rename`, `tab.close`, `tab.next`, `tab.prev`
  - `space.select`, `space.move`, `space.new`
  - `pane.focus`, `pane.split`, `pane.zoom`, `pane.close`
  - `terminal.peek`
  - `layout.select`, `layout.show`, `layout.hide`, `layout.resize`
  - `app.settings`, `app.palette`, `mod.open`
  - `window.minimize`, `window.maximize`, `window.close` (only where the system draws no window buttons)

**Programs it runs and files it reads:** `hr808-spaces` runs `git status`/`git rev-parse` in each space's folder (on that space's machine), `gh pr view` for each branch's pull request (a network call through `gh`, for spaces on this computer only), `hc machine ls`, and `open <url>` when a PR label is clicked. It also watches each local space's repo folder (`watchFolder`) so branch and change counts stay current. `hr808` runs the sound engine (`sh -c 'osascript -l JavaScript engine.jxa … &'`, in the background) while pattern mode is open, and `pkill` to stop it. Under `mods/hr808/.beats/` it writes the drum sounds, the state file and a heartbeat file, reads the status file the engine writes, and deletes its `beat-*` files on leaving. The saved pattern and tempo are in the mod's `localStorage`. `hr808-agents` runs no programs and reads no files.

## Watch out

- **Install the theme too.** The layout names `hr808`, which lives in `themes/hr808.json`; copying only the layout file and mod folders loses the palette and the ink contrast.
- **`herdr-app check` writes `gpui-kit.d.ts` and `jsconfig.json` into every mod folder it checks.** Don't commit them; the repo's `.gitignore` covers both.
- **Mods can't import from another mod's folder.** That's why `hr808` is one mod picking its part by props rather than five mods. The LED is written three times (`hr808/panel.js`, `hr808-spaces` `statusLed`, `hr808-agents` `led`), and the space key twice; change them together.
- **`herdr-app check` doesn't render the parts.** With no props, `hr808` draws an empty `div`, so the check only proves the modules load. Verify each part in the live window (`herdr-app status` for errors, `herdr-app shot` to look).
- **The tab keys sit in a horizontal scroll container, and that container takes all the width it's given.** Capping it doesn't help. Put the + key and the orange rule inside the scrolling row, with the rule `flex_1`, so the rule fills whatever the keys leave.
- **Line everything up to the keys, not the bar.** The step numbers hang under the keys, so the keys aren't centered in the 46px bar. Top-align the bar (`pt(4)`, `items_start`) and give the +, rule, print and switches 26px boxes. Do the same in the brand row so its rule meets the tab bar's.
- **The font draws "+" about 2.5px below center.** Draw it (`plus.svg`) rather than typing it.
- **Red `#fb4934` and orange `#fe8019` are only 1.36:1 apart at this size.** Colored dots alone can't tell blocked from working, which is why each state has its own shape. The same goes for yellow done versus orange working (1.49:1).
- **A lit LED on a key of its own color disappears.** That's why every lit LED sits in a black socket.
- **An off LED must take the same 12px as a lit one,** or names shift sideways every time an agent starts or stops.
- **`flex_shrink` takes a number.** `flex_shrink()` with nothing throws at render time.
- **Don't animate the LEDs.** A loop or spinner repaints the whole window for as long as the state lasts.
- **The ink `#111111` is fixed.** Picking a light theme in the theme picker leaves the keys, strip and labels hard to read.
- **Both list mods are modified copies of Herdr's Apache-2.0 mods,** and say so in a header comment. They're shared under the same license (`LICENSE` at the repo root).
- **Both list mods are clones.** They won't get Herdr's later fixes to the shipped `spaces` and `agents` mods. A clone also starts with fresh local state: agent pins and "time since changed" don't carry over from the shipped `agents` mod.
- **Assumes macOS:** the window-button spot and the Futura and Helvetica Neue fonts. Elsewhere the fonts fall back, and the tab bar draws its own window buttons.
- **PR labels need `gh` installed and signed in** for each repo's host, and only appear for spaces on this computer. Without `gh` the labels don't appear and nothing else changes.
- **Each mod draws only its own assets and Herdr's shipped icons** (`mods/workspace-chrome/`, `mods/pane/`). If you rename a mod to avoid a clash, rewrite its own `mods/<name>/` paths, and in `hr808-agents` the `openOverlay({ mod: "hr808-agents" })` that opens its sort menu.
- **The collapsed footer only fits SETTINGS.** ADD MACHINE is reachable after expanding the sidebar.
- **Limits:** the step numbers past 9 have no shortcut, and the review marks are only shown on open PRs.
- **Herdr's script engine is far slower than Node and interrupts long synchronous work.** Building the drum sounds in one go got cut off. Split it at `await` points, and build them once into files rather than on every START.
- **Herdr's one sound call, `playSound(file)`, plays a single MP3 and can't schedule, and `exec` stops what it runs after 30 s.** Sound comes from a separate process started in the background (`sh -c '… &'`). It must stop itself: the engine quits once a heartbeat file, touched once a second while pattern mode is open, is missing or 3 s stale. It counts from its own last wake, so a Mac waking from sleep isn't mistaken for Herdr going away.
- **Don't restart audio per edit.** Rendering a bar and swapping players on every edit clicked, doubled hits, and lagged; one long-running engine takes edits as data instead.
- **`afplay` is slow** (about 730 ms of overhead per play), and AVAudioPlayerNode buffer scheduling crashes or hangs from JXA. AVAudioSequencer with AVAudioUnitSampler works.
- **AVMusicTrack looping cuts ringing notes at the loop seam,** so the engine writes notes ahead on long, non-looping tracks.
- **The sampler's default release is 0 s,** a hard cut at every note-off. Set 8 ms (stage 5 of the amplitude envelope in `AUAudioUnit.fullState`) and read it back.
- **A running audio output keeps the Mac awake** (coreaudiod holds an idle-sleep assertion), which is why the engine pauses after 60 s stopped.
- **Herdr's timers fire about 40 ms late on average,** with spikes to 250 ms, so the playhead trails the sound a little. Its native animations share one app clock a mod can't line up with the audio. Light step 1 straight away on START rather than waiting for the engine's first answer.
- **Name each run's files with an id for that mod copy.** A reloaded copy counts from 1 again and would read the old copy's status file.
- **Mark the drum sounds as complete only after all six are written,** so a crash mid-write rebuilds them.
- **Assumes macOS for sound.** Elsewhere pattern mode warns that the engine needs `osascript`.

## Done when

- `herdr-app check` passes for `mods/hr808`, `mods/hr808-spaces` and `mods/hr808-agents`, and `herdr-app status` shows `errors: []` with the layout shown.
- **Tab bar:**
  - Each tab is a colored key in fours (red, orange, yellow, cream) with its number underneath, and the shown tab's number is on a cream bar.
  - The + key's plus and the keys share one centerline. The orange rule runs from the + to "Agent Composer", level with the rule after "Herdr".
- **LEDs:** a terminal reporting `\e]7501;state=blocked:app=claude-code\a` shows a red square in its tab key, pane label, space row, agent row and the status strip's "needs you" count. `state=working` shows an orange dot, and `state=done` a yellow ring.
- **PR labels:** an open PR with approved review and passing checks shows a beige label with a green LED and ✓. A merged PR shows a tan label with no LED and no mark.
- **Worktrees** hang off their repo's key on gray bracket lines. The selected space has a cream outline, and hovering any row shows a faint one and a pointer.
- **Collapsed sidebar:** every space and agent becomes a numbered key, and space key 3 is the space `ctrl-3` selects.
- **Files and Changes** toggle their panel, and their indicator lights cream only while it's open.
- **Pattern mode:**
  - Clicking the print shows the sequencer with START reading LOADING, then START once the engine answers. `.beats/voices-1/` then holds six WAVs and a `complete` marker.
  - START plays from step 1 (the starter beat on a first open, the saved pattern after), and the playhead begins on step 1.
  - Adding or removing a hit while playing lands at the next step without a click. A tempo scroll changes the speed without a restart.
  - `pgrep -f mods/hr808/.beats/beat-` shows exactly one engine while pattern mode is open, and none 2 s after leaving it.
  - Force-quitting Herdr with pattern mode open: the engine is gone within about 3 s.
- **The gray strip** runs the full width of the window bottom: SETTINGS and ADD MACHINE on the left, the agent meters and COMMANDS on the right.
