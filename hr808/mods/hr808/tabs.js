import { div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, panes, theme, run, openOverlay, layout, shared, window } from "herdr";
import { INK, led, ledState } from "./panel.js";
import { Seq } from "./seq.js";
import { VOICES } from "./synth.js";

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

function tabName(c) {
  if (c.named) return c.name;
  const ps = panes().filter((p) => p.tab === c.id);
  return (ps.find((p) => p.program?.agent) ?? ps[0])?.program?.name ?? c.name;
}

const stop = (_e, cx) => cx.stop_propagation();
const VOICE_NAMES = { bd: "Bass drum", sd: "Snare drum", cp: "Hand clap", ch: "Closed hi-hat", oh: "Open hi-hat", cb: "Cow bell" };

// The tab bar as the 808's step keys: red, orange, yellow and cream in fours,
// a status LED on each, the shown tab underlined in cream. Then the orange
// rule and the "Agent Composer" print, and the Files / Changes switches.
// Clicking the print swaps the tabs for a step sequencer (seq.js), and back.
export class Tabs {
  constructor() {
    this.pressed = null;
    this.mode = "tabs";
    this.seq = new Seq();
    this.panels = JSON.parse(localStorage.getItem("panels") ?? "{}");
  }

  // As the shipped tab bar: the side panel is remembered per space.
  syncPanel(space, panel, body, enabled) {
    if (!space || !panel) return;
    const now = panel.hidden ? null : body?.active ?? null;
    if (space.id !== this.space) {
      const first = this.space === undefined;
      this.space = space.id; this.pending = null;
      if (!(first && !(space.id in this.panels))) {
        const stored = this.panels[space.id] ?? null, want = enabled.includes(stored) ? stored : null;
        if (want !== now) {
          this.pending = { want, until: Date.now() + 1000 };
          if (want) { run("layout.select", { stack: "panel-body", child: want }); run("layout.show", { id: "panel" }); }
          else run("layout.hide", { id: "panel" });
          return;
        }
      }
    }
    if (this.pending) {
      if (this.pending.want !== now && Date.now() < this.pending.until) return;
      this.pending = null;
    }
    if (this.panels[space.id] === now) return;
    this.panels[space.id] = now;
    localStorage.setItem("panels", JSON.stringify(this.panels));
  }

  key(t, c, i, shown, space, step) {
    const color = [t.ansi9, t.accent, t.ansi11, t.foreground][Math.floor(i / 4) % 4];
    const name = tabName(c);
    // The step number under the key, as printed on the 808: it's also the
    // cmd-<n> shortcut; settled tabs have none. Under the shown tab it sits on a cream bar.
    const bar = () => div().flex_1().h(2).rounded(1).bg(c.active ? t.foreground : "#00000000");
    return v_flex().flex_none().gap(2)
      .child(h_flex().id(`tab-${c.id}`).h(26).px(9).gap(7).min_w(60).max_w(220).items_center().rounded(3)
        .bg(color).border(1).border_color("#00000080").text_size(12.5).text_color(INK)
        .when(c.active, (el) => el.font_semibold())
        .hover((s) => s.border_color(t.foreground))
        .on_mouse_down("left", (e, cx) => { cx.stop_propagation(); this.pressed = i; if (e.click_count === 2) run("tab.rename", { id: c.id }); })
        .on_mouse_up("left", () => {
          const from = this.pressed;
          this.pressed = null;
          if (from !== null && from !== i) run("tab.move", { id: shown[from].id, index: c.index });
          else run("tab.select", { id: c.id });
        })
        .on_mouse_down("right", () => openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: c.id, space: space.id } } }))
        .child(led(t, ledState(c.status), 6))
        .child(div().min_w(0).truncate().child(c.zoomed ? `${name} Z` : name))
        .when(c.active, (el) => el.child(div().id(`close-${c.id}`).flex_none().opacity(0.7).hover((s) => s.opacity(1))
          .on_mouse_down("left", stop).on_click((_e, cx) => { cx.stop_propagation(); run("tab.close", { id: c.id }); })
          .child(svg("mods/pane/close.svg").size(12)))))
      .child(h_flex().h(12).mx(3).gap(5).items_center()
        .child(bar())
        .child(div().flex_none().text_size(10).font_semibold().text_color(c.active ? t.foreground : t.muted).child(step ? String(step) : ""))
        .child(bar()));
  }

  close() {
    return this.seq.leave();
  }

  // A round red LED, as on the 808's step keys; dark glass when off.
  stepLed(t, on) {
    return on
      ? div().size(12).flex().items_center().justify_center().rounded_full().bg("#000000").child(div().size(8).rounded_full().bg(t.blocked))
      : div().size(12).flex().items_center().justify_center().child(div().size(6).rounded_full().bg("#3a1611").border(1).border_color("#00000066"));
  }

  // Pattern mode: pick an instrument, click steps on and off, START/STOP plays
  // the loop, scroll the tempo to change it.
  pattern(t) {
    const seq = this.seq;
    const now = seq.step();
    const colors = [t.ansi9, t.accent, t.ansi11, t.foreground];
    const voiceKey = (v) => div().id(`voice-${v}`).h(26).px(5).flex_none().flex().items_center().rounded(2)
      .text_size(10).font_semibold().tooltip(VOICE_NAMES[v]).cursor_pointer()
      .when(seq.voice === v, (el) => el.bg(t.foreground).text_color(INK))
      .when(seq.voice !== v, (el) => el.border(1).border_color(t.dim).text_color(t.muted).hover((s) => s.border_color(t.foreground)))
      .on_mouse_down("left", stop).on_click((_e, cx) => { seq.select(v); cx.notify(); })
      .child(v.toUpperCase());
    const stepKey = (n) => v_flex().flex_1().min_w(0).gap(2)
      .child(div().id(`seq-step-${n}`).h(26).flex().items_center().justify_center().rounded(3).bg(colors[Math.floor(n / 4)])
        .border(now === n ? 2 : 1).border_color(now === n ? t.foreground : "#00000080").cursor_pointer()
        .on_mouse_down("left", stop).on_click((_e, cx) => { seq.toggle(n, cx); cx.notify(); })
        .child(this.stepLed(t, seq.on(seq.voice, n))))
      .child(div().h(12).text_center().text_size(10).font_semibold().text_color(now === n ? t.foreground : t.muted).child(String(n + 1)));
    return h_flex().flex_1().min_w(0).gap(8).items_start()
      .child(h_flex().flex_none().gap(3).children(VOICES.map(voiceKey)))
      .child(h_flex().flex_1().min_w(0).gap(8).children([0, 1, 2, 3].map((g) => h_flex().flex_1().min_w(0).gap(3).children([0, 1, 2, 3].map((k) => stepKey(g * 4 + k))))))
      // A fixed width: LOADING, START and STOP differ, and the tempo beside it mustn't move.
      // Until the sound engine answers, the key reads LOADING and does nothing.
      .child(h_flex().id("seq-start").h(26).w(72).gap(6).flex_none().items_center().justify_center().rounded(3).bg(t.foreground).border(1).border_color(t.muted)
        .text_size(10).font_semibold().text_color(INK).on_mouse_down("left", stop)
        .when(!seq.ready, (el) => el.opacity(0.55).tooltip("The sound engine is starting").child("LOADING"))
        .when(seq.ready, (el) => el.cursor_pointer().hover((s) => s.border_color(t.accent))
          .on_click((_e, cx) => { seq.playing ? seq.stop(cx) : seq.start(cx); cx.notify(); })
          .child(this.stepLed(t, seq.playing)).child(seq.playing ? "STOP" : "START")))
      // Fixed width so 99 to 100 BPM doesn't move the print. Scroll deltas are in
      // pixels, so a step of tempo takes a few of them, not every event.
      .child(div().id("seq-tempo").h(26).w(68).flex_none().flex().items_center().justify_center().rounded(2).border(1).border_color(t.dim)
        .text_size(12).text_color(t.foreground).tooltip("Scroll to change the tempo")
        .on_scroll_wheel((e, cx) => {
          this.scrolled = (this.scrolled ?? 0) + e.delta.y;
          const steps = Math.trunc(this.scrolled / 6);
          if (!steps) return;
          this.scrolled -= steps * 6;
          seq.tempo(steps, cx);
          cx.notify();
        })
        .child(`${seq.bpm} BPM`));
  }

  switch(t, id, label, on, action) {
    return h_flex().id(id).h(26).px(8).gap(6).flex_none().items_center().rounded(3)
      .border(1).border_color(on ? t.foreground : t.dim).text_size(12).text_color(on ? t.foreground : t.muted)
      .hover((s) => s.border_color(t.foreground)).on_mouse_down("left", stop).on_click(action)
      .child(on
        ? div().size(10).flex_none().flex().items_center().justify_center().rounded_full().bg("#000000").child(div().size(6).rounded_full().bg(t.foreground))
        : div().size(8).flex_none().mx(1).rounded_full().border(1).border_color(t.muted))
      .child(label);
  }

  render() {
    const t = theme();
    const space = spaces().find((s) => s.active);
    const shown = space?.tabs ?? [];
    // Step numbers count only tabs that aren't settled, as tab.select (cmd-<n>) does.
    const steps = new Map(shown.filter((c) => !c.settled).map((c, n) => [c.id, n + 1]));
    const panel = find(layout(), "panel");
    const body = find(layout(), "panel-body");
    const enabled = shared("workspace.panels") ?? ["files", "changes"];
    this.syncPanel(space, panel, body, enabled);
    const showing = panel && !panel.hidden ? body?.active : null;
    const showPanel = (id) => {
      if (showing === id) run("layout.hide", { id: "panel" });
      else { run("layout.select", { stack: "panel-body", child: id }); run("layout.show", { id: "panel" }); }
    };
    const button = (id, label, action) => div().id(id).size(26).flex_none().flex().items_center().justify_center().rounded(3)
      .text_color(t.muted).hover((s) => s.bg(t.hover).text_color(t.foreground)).on_mouse_down("left", stop).on_click(action).child(label);
    // Everything sits on the keys' line, above the row of step numbers.
    return h_flex().size_full().min_w(0).px(10).pt(4).gap(10).items_start().bg(t.canvas).border_b(1).border_color(t.border)
      .on_mouse_up("left", () => { this.pressed = null; })
      .on_scroll_wheel((e) => { if (this.mode === "tabs" && Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next"); })
      .when(this.mode === "pattern", (el) => el.child(this.pattern(t)))
      // The + and the rule ride inside the scroll: the rule fills what the keys leave.
      .when(this.mode === "tabs", (el) => el.child(h_flex().id("tab-scroll").flex_1().min_w(0).h_full().items_start().gap(5).overflow_x_scrollbar()
        .children(shown.map((c, i) => this.key(t, c, i, shown, space, steps.get(c.id))))
        .child(div().id("tab-new").h(26).w(30).flex_none().flex().items_center().justify_center().rounded(3)
          .bg(t.foreground).border(1).border_color(t.muted).text_color(INK)
          .hover((s) => s.border_color(t.accent)).on_mouse_down("left", stop)
          .on_click(() => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 }))
          // A drawn plus: the font's "+" sits below the middle of the key.
          .child(svg("mods/hr808/plus.svg").size(12)))
        .child(h_flex().flex_1().min_w(16).ml(5).h(26).items_center().child(div().w_full().h(1).bg(t.accent)))))
      // The print is the way in and out of pattern mode; leaving stops the beat.
      .child(h_flex().id("composer").flex_none().h(26).items_center().cursor_pointer()
        .tooltip(this.mode === "pattern" ? "Back to tabs" : "Rhythm composer")
        .on_mouse_down("left", stop)
        .on_click((_e, cx) => { if (this.mode === "pattern") { this.seq.leave(cx); this.mode = "tabs"; } else { this.mode = "pattern"; this.seq.enter(cx); } cx.notify(); })
        .child(h_flex().gap(8).items_baseline()
        .child(div().font_family("Futura").italic().font_medium().text_size(17).text_color(t.accent).child(this.mode === "pattern" ? "Rhythm Composer" : "Agent Composer"))
        .child(div().font_family("Futura").font_medium().text_size(12).text_color(t.accent).child("HR-808"))))
      .when(this.mode === "tabs" && enabled.includes("files"), (el) => el.child(this.switch(t, "panel-files", "Files", showing === "files", () => showPanel("files"))))
      .when(this.mode === "tabs" && enabled.includes("changes"), (el) => el.child(this.switch(t, "panel-changes", "Changes", showing === "changes", () => showPanel("changes"))))
      .when(window()?.buttons, (el) => el.child(button("minimize", "−", () => run("window.minimize")))
        .child(button("maximize", "□", () => run("window.maximize")))
        .child(button("close-window", svg("mods/pane/close.svg").size(13), () => run("window.close"))));
  }
}
