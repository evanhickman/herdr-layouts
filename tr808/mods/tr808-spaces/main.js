// Modified from Herdr's shipped `spaces` mod (herdrdev/herdr-app, Apache-2.0):
// drawn in the TR-808 look, with an LED for each space's agents, step-key
// avatars, worktree brackets, and PR track labels (checks LED, review mark).
//
// Workspace spaces: worktrees under their checkout, grouped by machine when more
// than one is known. After a space's name, the repo its first terminal is in now,
// only where unusual: branch, ahead/behind; and its branch's pull request
// (`gh pr view`, gh's own sign-in) as a track label. Click to switch, right-click
// for its menu, drag to reorder.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, machines, panes, agents, run, openOverlay, exec, hc, theme, shared, setShared, watchFolder, window } from "herdr";

// Where a space is now: its first terminal's live folder, else where it was made.
// `ps`: panes(), read once by the caller (each read copies every pane).
function place(s, ps) {
  const tabs = new Set((s.tabs ?? []).map((c) => c.id));
  return ps.find((p) => tabs.has(p.tab) && p.cwd)?.cwd || s.folder;
}
const rowHeight = ({ tree }) => (tree ? 28 : 30);
const where = (s, ps) => JSON.stringify([s.machine ?? null, place(s, ps)]);
const base = (path) => path.replace(/\/+$/, "").split("/").pop();
// Changes made outside Herdr (an editor's save, a commit in another app): looked
// for this often, in repos the list shows, while the window is in front.
const FALLBACK = 60000;

const PR_FIELDS = "number,title,state,isDraft,reviewDecision,statusCheckRollup,url";
const FAILED = new Set(["FAILURE", "TIMED_OUT", "CANCELLED", "ACTION_REQUIRED", "STARTUP_FAILURE", "ERROR"]);

function checks(rollup) {
  if (!rollup?.length) return null;
  let pending = false;
  for (const c of rollup) {
    if (FAILED.has(c.conclusion) || FAILED.has(c.state)) return "failing";
    if ((c.status && c.status !== "COMPLETED") || c.state === "PENDING" || c.state === "EXPECTED") pending = true;
  }
  return pending ? "pending" : "passing";
}

// A stored space color name as a key color: the theme's bright ANSI step.
const KEY = { ansi6: "ansi14", ansi3: "ansi11", ansi4: "ansi12", ansi5: "ansi13", ansi2: "ansi10", ansi1: "ansi9" };


export default class Spaces extends View {
  init(_props, cx) {
    this.git = {}; // where() -> { name, branch, ahead, behind, repo, linked }, null: not a repo
    this.checked = {}; // where() -> when it was last looked at
    this.unsure = new Set(); // where()s git couldn't answer for (a machine away)
    this.pending = new Set(); // where()s to look at next
    this.busy = {}; // pane -> an agent working or a program in front of its shell
    this.ready = {}; // machine -> its layout was readable at the last look
    this.at = {}; // space -> its where() at the last look
    this.watching = new Set(); // local repos' git folders
    this.prs = {}; // where() -> { pr } | { none } | { error }, local repos only
    this.prKey = "";
    this.prAt = 0;
    // Spaces made while this runs wait (at most a moment) for their git, so a
    // worktree appears under its repo instead of jumping there.
    this.shown = new Set(spaces().map((s) => s.id));
    this.born = {};
    this.pressed = null;
    this.over = null;
    this.group = null; // the reorder group the drag started in (see row)
    this.machines = [];
    this.folded = new Set(JSON.parse(localStorage.getItem("machines.folded") ?? "[]"));
    this.refreshMachines(cx);
    cx.timer.every(15000, cx => this.refreshMachines(cx));
    // `git status` walks the whole tree, on another machine a process there:
    // only when its answer could have changed (see `due`).
    cx.timer.every(250, (cx) => this.checkNew(cx));
    // gh is a network call: only when a branch changed or the fallback is due.
    cx.timer.every(5000, (cx) => {
      if (this.prTargets().join("|") !== this.prKey || Date.now() - this.prAt > FALLBACK) this.refreshPrs(cx);
    });
  }

  // Local repos the list knows, with their branch, so a checkout asks gh again.
  prTargets() {
    return Object.keys(this.git).filter((k) => this.git[k] && !JSON.parse(k)[0]).sort().map((k) => `${k}@${this.git[k].branch}`);
  }

  refreshPrs(cx) {
    if (this.prLoading) return;
    this.prLoading = true;
    const list = this.prTargets();
    this.prKey = list.join("|");
    this.prAt = Date.now();
    cx.spawn(async (cx) => {
      try {
        const prs = {};
        await Promise.all(list.map(async (target) => {
          const k = target.slice(0, target.lastIndexOf("@"));
          try {
            const r = await exec("gh", ["pr", "view", "--json", PR_FIELDS], { cwd: JSON.parse(k)[1] });
            if (r.code === 0) prs[k] = { pr: JSON.parse(r.stdout) };
            else if (/no pull requests found/i.test(r.stderr)) prs[k] = { none: true };
            else prs[k] = { error: r.stderr.trim().split("\n")[0] || "gh failed" };
          } catch (e) {
            prs[k] = { error: String(e?.message ?? e) };
          }
        }));
        this.prs = prs;
      } finally {
        this.prLoading = false;
        cx.notify();
      }
    });
  }

  checkNew(cx) {
    const now = Date.now();
    const sp = spaces();
    for (const s of sp) if (!this.shown.has(s.id)) this.born[s.id] ??= now;
    const due = this.due(now, sp, panes());
    if (due.size) this.refreshGit(due, cx);
    if (sp.some((s) => !this.shown.has(s.id))) cx.notify();
  }

  // Places whose git could have changed: new ones (a new space, a cd), where a
  // command or an agent's turn just ended (a checkout, a commit, edits), those on
  // a machine that is back, and repos in view whose fallback is due.
  due(now, sp, ps) {
    // Moved there: what it knew of that place may be old.
    const at = {};
    for (const s of sp) at[s.id] = where(s, ps);
    const keys = new Set(Object.values(at).filter((k) => JSON.parse(k)[1]));
    const due = new Set([...keys].filter((k) => !(k in this.git)));
    for (const [id, k] of Object.entries(at)) if (this.at[id] && this.at[id] !== k && keys.has(k)) due.add(k);
    this.at = at;
    const spaceOf = {};
    for (const s of sp) for (const t of s.tabs ?? []) spaceOf[t.id] = s;
    const busy = {};
    for (const p of ps) {
      if (!p.terminal || !spaceOf[p.tab]) continue;
      busy[p.pane] = p.status === "working" || !(p.program?.shell || p.program?.agent);
      if (this.busy[p.pane] && !busy[p.pane]) this.sameRepo(at[spaceOf[p.tab].id], keys).forEach((k) => due.add(k));
    }
    this.busy = busy;
    for (const m of machines()) {
      const ready = m.layout === "ready";
      if (ready && this.ready[m.name] === false) for (const k of keys) if (JSON.parse(k)[0] === m.name) due.add(k);
      this.ready[m.name] = ready;
    }
    if (window().active) {
      for (const k of keys) {
        const asks = this.git[k] || this.unsure.has(k);
        if (asks && !this.folded.has(JSON.parse(k)[0]) && now - (this.checked[k] ?? 0) > FALLBACK) due.add(k);
      }
    }
    return due;
  }

  // `key` and the other places in its repo (a commit there moves their ahead/behind).
  sameRepo(key, keys) {
    const repo = this.git[key]?.repo;
    return [key, ...(repo ? [...keys].filter((k) => this.git[k]?.repo === repo) : [])];
  }

  refreshMachines(cx) {
    cx.spawn(async cx => {
      try { const r = await hc(["machine", "ls", "--json"]); if (r.code === 0) this.machines = (JSON.parse(r.stdout).machines ?? []).filter((m) => !m.temporary); } catch {}
      cx.notify();
    });
  }

  // One look at a time, each place once however often it was asked for meanwhile.
  refreshGit(keys, cx) {
    for (const k of keys) this.pending.add(k);
    if (this.refreshing) return;
    this.refreshing = true;
    cx.spawn(async (cx) => {
      while (this.pending.size) {
        const keys = [...this.pending];
        this.pending.clear();
        for (const key of keys) await this.check(key, cx);
      }
      const used = new Set(Object.values(this.git).filter(Boolean).map((g) => JSON.parse(g.repo)).filter(([on]) => !on).map(([, repo]) => repo));
      for (const repo of this.watching) if (!used.has(repo)) this.watching.delete(repo);
      this.refreshing = false;
      cx.notify();
    });
  }

  // One place's git: branch, ahead/behind, its repo.
  async check(key, cx) {
    const [on, cwd] = JSON.parse(key);
    this.checked[key] = Date.now();
    this.unsure.delete(key);
    try {
      // No optional locks: a status that touched the index would wake the watch again.
      const r = await exec("git", ["--no-optional-locks", "status", "--porcelain=v2", "--branch"], { cwd, on });
      if (r.code !== 0) {
        // Only git's own "no" is remembered as no repo; anything else is asked again.
        if (!/not a git repository/i.test(r.stderr)) this.unsure.add(key);
        this.git[key] = null;
        return;
      }
      // The repo's own .git folder names it; a worktree's top differs from it.
      const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd, on });
      const common = await exec("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd, on });
      const repo = common.stdout.trim();
      const name = repo.endsWith("/.git") ? base(repo.slice(0, -5)) : base(repo).replace(/\.git$/, "");
      const info = { name, branch: null, ahead: 0, behind: 0, repo: JSON.stringify([on, repo]), linked: repo !== `${top.stdout.trim()}/.git` };
      for (const line of r.stdout.split("\n")) {
        if (line.startsWith("# branch.head ")) info.branch = line.slice(14);
        else if (line.startsWith("# branch.ab ")) {
          const [a, b] = line.slice(12).split(" ");
          info.ahead = Math.abs(parseInt(a, 10)) || 0;
          info.behind = Math.abs(parseInt(b, 10)) || 0;
        }
      }
      this.git[key] = info;
      if (!on) this.watch(repo, cx);
    } catch {
      // Couldn't ask (the machine is away): keep what it showed, look again later.
      this.git[key] ??= null;
      this.unsure.add(key);
    }
  }

  watch(repo, cx) {
    if (this.watching.has(repo)) return;
    this.watching.add(repo);
    cx.spawn(async (cx) => {
      try {
        while (this.watching.has(repo)) {
          await watchFolder(repo);
          const mine = JSON.stringify([null, repo]);
          if (this.watching.has(repo)) this.refreshGit(Object.keys(this.git).filter((k) => this.git[k]?.repo === mine), cx);
        }
      } catch { this.watching.delete(repo); }
    });
  }

  cancelDrag() {
    this.pressed = null;
    this.over = null;
    this.group = null;
  }

  menu(w) {
    // A popup is as tall as its items; height is only the most.
    openOverlay({ mod: "menu", kind: "popup", width: 200, height: 260, props: { tab: "space", target: { id: w.id } } });
  }

  // Spaces in order, each worktree space moved under its main checkout's.
  ordered() {
    const sp = spaces(), ps = panes();
    const ready = (w) => this.shown.has(w.id) || where(w, ps) in this.git || Date.now() - (this.born[w.id] ??= Date.now()) > 1500;
    for (const w of sp) if (!this.shown.has(w.id) && ready(w)) this.shown.add(w.id);
    const list = sp.map((w, i) => ({ w, i, k: where(w, ps), g: this.git[where(w, ps)] ?? null })).filter((r) => this.shown.has(r.w.id));
    const mains = new Set(list.filter((r) => r.g && !r.g.linked).map((r) => r.g.repo));
    const nested = (r) => r.g?.linked && mains.has(r.g.repo);
    const out = [];
    const placed = new Set(); // repos whose worktrees are listed (under the first of its spaces)
    for (const r of list) {
      if (nested(r)) continue;
      out.push({ ...r, tree: null });
      if (!r.g || r.g.linked || placed.has(r.g.repo)) continue;
      placed.add(r.g.repo);
      const kids = list.filter((k) => nested(k) && k.g.repo === r.g.repo);
      if (kids.length) out[out.length - 1].parent = true;
      kids.forEach((k, n) => out.push({ ...k, tree: n === kids.length - 1 ? "└─" : "├─" }));
    }
    return out;
  }

  // The rows, under a header per machine once one isn't this computer.
  grouped(t, collapsed) {
    const rows = this.ordered();
    const draw = (r) => (collapsed ? this.compactKey(r.w, r.i, t) : this.row(r, t));
    const remote = [...new Set([...rows.map(r => r.w.machine).filter(Boolean), ...this.machines.map(m => m.name)])].sort();
    const loading = m => {
      const layout = machines().find(k => k.name === m)?.layout;
      return layout === "loading" || (!layout && this.machines.some(k => k.name === m && k.state === "connected"))
        || spaces().some(s => (s.machine ?? null) === m && !this.shown.has(s.id));
    };
    const loadingRow = m => div().id(`machine-loading-${m ?? "local"}`).h(28).flex_none().px(8).text_size(12).text_color(t.dim).child(collapsed ? "…" : "Loading…");
    if (!remote.length) return loading(null) && !rows.length ? [loadingRow(null)] : rows.map(draw);
    const machineNames = [null, ...remote];
    return machineNames.flatMap((m) => {
      const mine = rows.filter((r) => (r.w.machine ?? null) === m);
      const machine = this.machines.find(k => k.name === m);
      const connected = !m || machine?.state === "connected";
      const folded = this.folded.has(m);
      const head = h_flex().id(`machine-${m ?? "local"}`).h(26).flex_none().px(collapsed ? 2 : 8).gap(7).items_center().text_size(11).text_color(t.dim)
        .cursor_pointer().hover(s => s.bg(t.hover))
        .on_click((_e, cx) => {
          folded ? this.folded.delete(m) : this.folded.add(m);
          localStorage.setItem("machines.folded", JSON.stringify([...this.folded]));
          cx.notify();
        })
        .child(svg(`mods/workspace-chrome/${m ? "server" : "monitor"}.svg`).size(13).flex_none())
        .when(!collapsed, el => el.child(div().flex_1().truncate().child(m ?? "This computer"))
          .when(!connected, el => el.child(div().flex_none().child((machine?.state ?? "asleep").replace(/_/g, " "))))
          .when(connected, el => el.child(div().id(`machine-add-${m ?? "local"}`).flex_none().px(4).rounded(4).hover(s => s.bg(t.hover).text_color(t.foreground))
            .on_click((_e, cx) => { cx.stop_propagation(); run("space.new", m ? { machine: m } : {}); }).child("+")))
          .child(div().size(6).rounded(3).flex_none().bg(connected ? t.ansi2 : t.dim))
          .child(svg(`mods/workspace-chrome/chevron-${folded ? "right" : "down"}.svg`).size(11).flex_none()));
      const empty = h_flex().id(`machine-new-${m ?? "local"}`).h(28).flex_none().px(8).gap(7).items_center().rounded(7)
        .text_size(12).text_color(t.dim).hover(s => s.bg(t.hover).text_color(t.foreground))
        .on_click(() => run("space.new", m ? { machine: m } : {}))
        .child(svg("mods/workspace-chrome/plus.svg").size(12)).when(!collapsed, el => el.child("New space there"));
      return [head, ...(folded ? [] : mine.length ? mine.map(draw) : [loading(m) ? loadingRow(m) : empty])];
    });
  }

  // Only what's unusual, after the name: "herdr \u00b7 spike \u21912 \u21931". The repo or
  // branch goes when the name already says it (a worktree is named after its branch),
  // and master/main go: nearly every space is on one.
  gitTail(g, tree, name, t, pr) {
    const raw = g.branch ?? "detached";
    const same = (a) => a.toLowerCase() === name.toLowerCase();
    // A PR badge stands for its branch.
    const branch = pr?.pr || same(raw) || raw === "master" || raw === "main" ? "" : raw;
    const repo = tree || same(g.name) ? "" : g.name;
    const where = [repo, branch].filter(Boolean).join(" \u00b7 ");
    return h_flex()
      .flex_none()
      .gap(5)
      .items_center()
      .text_size(11.5)
      .text_color(t.dim)
      .when(Boolean(where), (el) => el.child(div().max_w(120).truncate().child(where)))
      .when(g.ahead > 0, (el) => el.child(div().flex_none().text_color(t.ansi2).child(`\u2191${g.ahead}`)))
      .when(g.behind > 0, (el) => el.child(div().flex_none().text_color(t.ansi1).child(`\u2193${g.behind}`)))
      .when(Boolean(pr?.pr || pr?.error), (el) => el.child(this.prBadge(pr, t)));
  }

  // The checks on an LED, the review as a mark after the number; the details are in the tooltip.
  prBadge({ pr, error }, t) {
    const badge = div().id(`pr-${pr?.number ?? "error"}`).flex_none().px(5).text_size(10.5);
    if (error) return this.trackLabel(badge, t, false, null).tooltip(error).child("#?");
    const review = { APPROVED: "approved", CHANGES_REQUESTED: "changes requested", REVIEW_REQUIRED: "review needed" }[pr.reviewDecision];
    const ci = checks(pr.statusCheckRollup);
    const parts = pr.state === "MERGED" ? ["merged"] : pr.state === "CLOSED" ? ["closed"] : pr.isDraft ? ["draft"] : [review, ci && `checks ${ci === "passing" ? "pass" : ci === "failing" ? "fail" : "running"}`].filter(Boolean);
    const open = pr.state === "OPEN" && !pr.isDraft;
    const checksLed = { failing: t.ansi1, pending: t.ansi3, passing: t.ansi2 }[ci] ?? null;
    const reviewMark = { APPROVED: "mods/workspace-chrome/check.svg", CHANGES_REQUESTED: "mods/workspace-chrome/x.svg", REVIEW_REQUIRED: "mods/tr808-spaces/circle.svg" }[pr.reviewDecision];
    // Stopped so the row under it neither selects nor starts a drag.
    return this.trackLabel(badge, t, open, open ? checksLed : null)
      .cursor_pointer().hover((s) => s.opacity(0.85))
      .tooltip([`#${pr.number} ${pr.title}`, ...parts].join(" \u00b7 "))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_mouse_up("left", (_e, cx) => { cx.stop_propagation(); exec("open", [pr.url]).catch(() => {}); })
      .child(`#${pr.number}`)
      .when(open && Boolean(reviewMark), (el) => el.child(svg(reviewMark).size(10).flex_none().text_color("#111111")));
  }

  // The TR-808's track labels: dark lettering,
  // beige while open, tan once merged, closed, a draft or unreadable. Ink can't
  // carry a status color, so the checks get an LED in a black socket; the
  // review gets a mark after the number (prBadge).
  trackLabel(badge, t, open, led) {
    return badge.flex().h(16).gap(4).items_center().rounded(2).bg(open ? t.foreground : t.muted).font_medium().text_color("#111111")
      .when(Boolean(led), (el) => el.child(div().size(10).flex_none().flex().items_center().justify_center().rounded_full().bg("#000000")
        .child(div().size(6).rounded_full().bg(led))));
  }

  row({ w, i, k, g, tree, parent }, t) {
    const on = w.active;
    // Worktrees reorder among their repo's, top-level spaces among the machine's:
    // `ordered()` draws them grouped, so a drop anywhere else would only snap back.
    const group = tree ? `tree:${g.repo}` : `top:${w.machine ?? ""}`;
    const target = this.pressed !== null && this.pressed !== i && this.over === i && this.group === group;
    return v_flex()
      .relative()
      .id(`space-${w.id}`)
      .px(8)
      .h(rowHeight({ tree }))
      .flex_none()
      .justify_center()
      // Every row has a 1px edge, cream when selected, faint cream on hover,
      // so selecting never shifts the row's contents.
      .cursor_pointer()
      .rounded(3)
      .border(1)
      .border_color(on ? t.foreground : "#00000000")
      .when(!on, (el) => el.hover((s) => s.border_color(t.foreground + "59")))
      // A gray bracket from the repo's key down to its worktrees, like the 808's
      // label brackets; ├ rows carry it on past themselves.
      .when(Boolean(parent), (el) => el.child(div().absolute().left(37).top(23).bottom(-1).w(1).bg(t.dim)))
      .when(Boolean(tree), (el) => el
        .child(div().absolute().left(37).top(-1).w(8).h(14).border_l(1).border_b(1).border_color(t.dim).rounded_bl(4))
        .when(tree === "├─", (el) => el.child(div().absolute().left(37).top(13).bottom(-1).w(1).bg(t.dim))))
      // The space lands where this row is: above it when moving up, below when moving down.
      .when(target, (el) => el.child(div().absolute().left(8).right(8).h(2).rounded(1).bg(t.accent).when(this.pressed < i, (b) => b.bottom(0)).when(this.pressed > i, (b) => b.top(0))))
      // on_mouse_move, not on_hover: with on_hover no drop line showed during a drag.
      .on_mouse_move((_e, cx) => {
        if (this.pressed === null || this.over === i) return;
        this.over = i;
        cx.notify();
      })
      .on_mouse_down("left", () => {
        this.pressed = i;
        this.over = null;
        this.group = group;
      })
      .on_mouse_up("left", (_e, cx) => {
        const from = this.pressed;
        const same = this.group === group;
        this.cancelDrag();
        if (from === null || from === i) run("space.select", { id: w.id });
        else if (same) run("space.move", { id: spaces()[from].id, index: i + 1 });
        cx.notify();
      })
      .on_mouse_down("right", () => this.menu(w))
      .child(
        h_flex()
          .gap(9)
          .items_center()
          .when(Boolean(tree), el => el.pl(40))
          .child(this.statusLed(w, t))
          .when(!tree, el => el.child(this.stepKey(w, t, 18, w.name[0]?.toUpperCase() ?? "?")))
          .child(div().flex_1().min_w(0).truncate().text_color(t.foreground).child(w.name))
          .when(Boolean(g), (el) => el.child(this.gitTail(g, tree, w.name, t, this.prs[k]))),
      );
  }

  // A space's status: an LED at the row's start, lit in its agents' most
  // urgent color, dark glass when nothing is going on; the tooltip and label
  // name the state.
  statusLed(w, t) {
    const label = { blocked: "needs input", done: "finished", working: "working" }[w.status];
    const socket = div().size(12).flex_none().flex().items_center().justify_center().rounded_full();
    if (!label) return socket.child(div().size(6).rounded_full().bg("#3a1611").border(1).border_color(t.border));
    const apps = agents().filter((a) => a.space === w.id && a.status === w.status).map((a) => a.app ?? "agent");
    const text = `${[...new Set(apps)].join(", ")} · ${label}`;
    // Each lit state has its own shape (as in the tr808 mod's LEDs): working a dot, blocked a square, done a ring.
    const mark = w.status === "blocked" ? div().size(8).bg(t.blocked)
      : w.status === "done" ? div().size(8).rounded_full().border(1.5).border_color(t.done)
      : div().size(8).rounded_full().bg(t.working);
    return socket.id(`status-${w.id}`).bg("#000000").tooltip(text).accessibility_label(text).child(mark);
  }

  // A step key in the space's color, gruvbox's bright step of it, ink lettering.
  stepKey(w, t, size, label) {
    const color = (shared("space.colors") ?? {})[w.id] ?? "ansi6";
    const fill = color.startsWith("#") ? color : t[KEY[color] ?? color];
    return h_flex().relative().size(size).flex_none().rounded(2).bg(fill).border(1).border_color("#00000080")
      .items_center().justify_center().text_size(10.5).font_bold().text_color("#111111").child(label);
  }

  // Collapsed: the space's key printed with its number (ctrl-<n>
  // selects it), its LED on the key's corner when something is going on, a cream
  // edge when selected.
  compactKey(w, i, t) {
    const lit = w.status === "working" || w.status === "blocked" || w.status === "done";
    return h_flex().id(`space-${w.id}`).h(28).flex_none().items_center().justify_center().rounded(3).cursor_pointer()
      .border(1).border_color(w.active ? t.foreground : "#00000000")
      .when(!w.active, (el) => el.hover((s) => s.border_color(t.foreground + "59")))
      .on_click(() => run("space.select", { id: w.id }))
      .tooltip(w.name)
      .child(this.stepKey(w, t, 20, String(i + 1))
        .when(lit, (el) => el.child(div().absolute().top(-4).right(-4).child(this.statusLed(w, t)))));
  }

  render() {
    const t = theme();
    const collapsed = shared("sidebar.collapsed") === true;
    const palette = ["ansi6", "ansi3", "ansi4", "ansi5", "ansi2", "ansi1"];
    const sp = spaces();
    const ids = new Set(sp.map(p => p.id));
    const kept = Object.fromEntries(Object.entries(shared("space.colors") ?? {}).filter(([id]) => ids.has(id)));
    let changed = Object.keys(kept).length !== Object.keys(shared("space.colors") ?? {}).length;
    for (const p of sp) {
      if (kept[p.id] || p.name === "~") continue;
      const uses = c => Object.values(kept).filter(v => v === c).length;
      kept[p.id] = palette.reduce((best, c) => uses(c) < uses(best) ? c : best);
      changed = true;
    }
    if (changed) setShared("space.colors", kept);
    return v_flex().size_full().min_h(0).bg(t.chrome).text_size(13)
      // The heading printed in a box like INSTRUMENT-SELECT, a gray rule to +.
      .child(h_flex().h(31).pl(16).pr(10).gap(8).items_center()
        .when(!collapsed, el => el
          .child(div().flex_none().h(16).px(5).flex().items_center().border(1).border_color(t.foreground).text_size(9).font_semibold().text_color(t.foreground).child("SPACES"))
          .child(div().flex_1().h(1).bg(t.dim)))
        .child(div().id("space-new").p(4).rounded(3).text_color(t.muted).hover(s => s.bg(t.hover).text_color(t.foreground)).on_click(() => run("space.new")).child(svg("mods/tr808-spaces/plus.svg").size(11))))
      .child(v_flex().flex_1().min_h(0).px(8).pb(14).overflow_y_scrollbar().mode("always")
        .on_mouse_up("left", (_e, cx) => { this.cancelDrag(); cx.notify(); })
        // Leaving the list drops the drag: a release outside it never reaches a row.
        .on_hover((hovered, cx) => { if (!hovered && this.pressed !== null) { this.cancelDrag(); cx.notify(); } })
        .children(this.grouped(t, collapsed)));
  }
}
