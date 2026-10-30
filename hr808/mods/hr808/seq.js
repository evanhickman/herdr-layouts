import { appHome, exec, notify, readTextFile, window, writeTextFile } from "herdr";
import * as fs from "fs/promises";
import { VERSION, VOICES, voices, wav } from "./synth.js";

// A starter groove, so the first START plays something.
const DEFAULT = {
  bpm: 112,
  voice: "bd",
  pattern: {
    bd: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    sd: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    cp: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    ch: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
    oh: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    cb: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
};

// The saved state, with anything missing or malformed taken from DEFAULT.
function load() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem("pattern") ?? "null"); } catch {}
  const bpm = Number.isFinite(saved?.bpm) ? Math.min(200, Math.max(60, saved.bpm)) : DEFAULT.bpm;
  const voice = VOICES.includes(saved?.voice) ? saved.voice : DEFAULT.voice;
  const pattern = {};
  for (const v of VOICES) {
    const row = saved?.pattern?.[v];
    pattern[v] = Array.isArray(row) && row.length === 16 ? row.map((x) => (x ? 1 : 0)) : [...DEFAULT.pattern[v]];
  }
  return { bpm, voice, pattern };
}

// How long to wait for the engine to answer a write before calling it gone.
const ANSWER = 3000;

// The pattern, its tempo, and the engine. Opening pattern mode launches
// engine.jxa once (AVAudioEngine and AVAudioSequencer through osascript, outside
// Herdr); after that every START, STOP, edit and tempo change is one write of
// the state file, which the engine follows without restarting the audio. It
// reports when beat 0 sounds, so the playhead follows the real clock. The
// engine quits once the alive file (touched once a second while pattern mode
// is open) goes stale, so a crash can't leave it running.
export class Seq {
  constructor() {
    this.state = load();
    this.open = false;
    this.playing = false;
    this.run = 0;
    this.rev = 0;
    this.ready = false; // the engine has answered, so START can go
    this.retried = false; // one relaunch per visit if the engine dies
    this.writing = Promise.resolve();
    this.heard = null; // the status file's last line
    this.listening = null; // the run a listener is reading for
    this.until = 0;
    this.t0 = null;
    this.barMs = null;
    // Names carry this copy's id: a reloaded copy counts runs from 1 again and
    // must not read an earlier copy's files.
    this.id = Date.now().toString(36);
    this.dir = `${appHome()}/mods/hr808/.beats`;
    this.voices = `${this.dir}/voices-${VERSION}`;
    this.engine = `${appHome()}/mods/hr808/engine.jxa`;
  }

  get bpm() { return this.state.bpm; }
  get voice() { return this.state.voice; }
  on(voice, step) { return Boolean(this.state.pattern[voice][step]); }
  name(rest, run = this.run) { return `${this.dir}/beat-${this.id}-${run}-${rest}`; }

  // The step under the playhead. Between START and the engine saying when beat 0
  // sounds, it's step 1: that's where the beat starts.
  step() {
    if (!this.playing) return null;
    if (this.t0 == null) return 0;
    const t = Date.now() - this.t0;
    return t < 0 ? null : Math.floor((t % this.barMs) / (this.barMs / 16));
  }

  save() { localStorage.setItem("pattern", JSON.stringify(this.state)); }

  select(voice) { this.state.voice = voice; this.save(); }

  toggle(step, cx) {
    const row = this.state.pattern[this.state.voice];
    row[step] = row[step] ? 0 : 1;
    this.save();
    this.push(cx);
  }

  tempo(delta, cx) {
    const bpm = Math.min(200, Math.max(60, this.state.bpm + delta));
    if (bpm === this.state.bpm) return;
    this.state.bpm = bpm;
    this.save();
    this.push(cx, this.playing);
  }

  // Pattern mode opened: voice files (once per synth version), the state, the
  // engine, and the heartbeat that keeps it alive. START waits (shown as
  // LOADING) until the engine answers.
  enter(cx) {
    if (this.open) return;
    this.open = true;
    this.run++;
    this.ready = false;
    this.heard = null;
    const run = this.run, alive = this.name("alive", run);
    this.keep = cx.timer.every(1000, () => { fs.writeFile(alive, "").catch(() => {}); });
    cx.spawn(async (cx) => {
      try {
        await fs.mkdir(this.voices, { recursive: true });
        // An engine left from an earlier run of this copy, then stale files. An
        // earlier copy's engine (before a reload) quits on its own heartbeat.
        await exec("pkill", ["-f", `${this.dir}/beat-${this.id}-`]).catch(() => {});
        await this.clean(run);
        // The marker is written last, so a build cut short (a quit, a crash) is redone.
        if (!(await fs.exists(`${this.voices}/complete`))) {
          const made = await voices(() => cx.sleep(1));
          for (const v of VOICES) await fs.writeFile(`${this.voices}/${v}.wav`, wav(made[v]));
          await fs.writeFile(`${this.voices}/complete`, "");
        }
        if (this.run !== run) return;
        await fs.writeFile(alive, "");
        await this.write(run);
        if (this.run !== run) return;
        const args = [this.engine, this.voices, this.name("state.json", run), alive, this.name("status", run)];
        // Backgrounded, because exec stops what it runs after 30 s.
        await exec("sh", ["-c", 'osascript -l JavaScript "$@" >/dev/null 2>&1 &', "sh", ...args]);
        this.listen(cx, run);
      } catch (e) {
        if (this.run === run) this.fail(cx, e);
      }
    });
  }

  // Pattern mode closed: the alive file goes, so the engine fades out and quits
  // by itself; pkill follows as a backup (at once from close(), which has 250 ms).
  // This copy's beat files are removed (keeping the new run's if pattern mode
  // has opened again meanwhile), and any stopped copy's; the voice files stay.
  leave(cx) {
    const run = this.run, alive = this.name("alive", run);
    this.open = false;
    this.playing = false;
    this.ready = false;
    this.retried = false;
    this.run++;
    this.t0 = null;
    this.keep?.cancel();
    this.tick?.cancel();
    this.keep = this.tick = null;
    // Only this run's engine: a quick reopen has already started the next one.
    const backup = () => exec("pkill", ["-f", `${this.dir}/beat-${this.id}-${run}-`]).catch(() => {})
      .then(() => this.clean(this.open ? this.run : undefined));
    const gone = fs.unlink(alive).catch(() => {});
    if (!cx) return gone.then(backup);
    cx.timer.after(800, () => { backup(); });
    return gone;
  }

  start(cx) {
    if (!this.open || !this.ready || this.playing) return;
    this.playing = true;
    this.t0 = null;
    this.push(cx, true);
    this.ticking(cx, this.run);
  }

  stop(cx) {
    if (!this.playing) return;
    this.playing = false;
    this.t0 = null;
    this.tick?.cancel();
    this.tick = null;
    this.push(cx);
  }

  // Writes the state for the engine; with `answer`, listens for its new beat-0 time.
  push(cx, answer = false) {
    if (!this.open) return;
    const run = this.run;
    cx.spawn(async (cx) => {
      try {
        await this.write(run);
        if (answer) this.listen(cx, run);
      } catch (e) {
        if (this.run === run) this.fail(cx, e);
      }
    });
  }

  // One write at a time, each the whole state with the next rev. writeTextFile
  // replaces the file atomically, so the engine never reads half of one; it
  // wants the current text, which nothing but this writes. A failed write
  // doesn't block the ones after it.
  write(run = this.run) {
    const next = this.writing.catch(() => {}).then(async () => {
      const text = JSON.stringify({ rev: ++this.rev, bpm: this.state.bpm, playing: this.playing, pattern: this.state.pattern });
      const path = this.name("state.json", run);
      await writeTextFile(path, text, await readTextFile(path));
    });
    this.writing = next;
    return next;
  }

  // One listener at a time reads the status file until ANSWER ms after the
  // last write that wanted an answer. "ok <beat 0 ms> <bpm>" sets the playhead;
  // "error: …", or no line at all, fails.
  listen(cx, run) {
    this.until = Date.now() + ANSWER;
    if (this.listening === run) return;
    this.listening = run;
    cx.spawn(async (cx) => {
      let answered = false;
      try {
        while (this.run === run && Date.now() < this.until) {
          await cx.sleep(25);
          const said = (await readTextFile(this.name("status", run)).catch(() => null))?.trim();
          if (!said || said === this.heard) continue;
          this.heard = said;
          answered = true;
          if (said.startsWith("error")) throw new Error(said.replace(/^error:\s*/, ""));
          if (!this.ready) { this.ready = true; this.retried = false; cx.notify(); }
          if (said.startsWith("ok") && this.playing) {
            const [, t0, bpm] = said.split(" ").map(Number);
            if (Number.isFinite(t0) && Number.isFinite(bpm)) {
              this.t0 = t0;
              this.barMs = 16 * 60000 / bpm / 4;
              // Draw the playhead now rather than at the next step, and time the ticks from here.
              cx.notify();
              this.ticking(cx, run);
            }
          }
        }
        if (this.run === run && !answered) throw new Error("The sound engine didn't answer. It needs macOS (osascript).");
      } catch (e) {
        if (this.run === run) this.fail(cx, e);
      } finally {
        if (this.listening === run) this.listening = null;
      }
    });
  }

  // Redraws the playhead at each step boundary, and only while Herdr is in front.
  ticking(cx, run) {
    this.tick?.cancel();
    const next = (cx) => {
      if (!this.playing || this.run !== run) return;
      const now = Date.now();
      if (this.t0 != null && window()?.active !== false) cx.notify();
      const stepMs = (this.barMs ?? 1000) / 16;
      const wait = this.t0 == null ? 25 : this.t0 > now ? this.t0 - now : stepMs - ((now - this.t0) % stepMs);
      this.tick = cx.timer.after(Math.max(15, Math.round(wait) + 2), next);
    };
    this.tick = cx.timer.after(0, next);
  }

  // The engine errored or went quiet (it may have died). Once per visit it's
  // started again, quietly, showing LOADING; after that, say why and leave
  // START waiting.
  fail(cx, e) {
    const again = this.open && !this.retried;
    const gone = this.leave();
    const left = this.run;
    if (again) {
      cx.spawn(async (cx) => {
        await gone;
        if (this.run !== left) return; // closed or reopened meanwhile
        this.enter(cx);
        this.retried = true;
        cx.notify();
      });
    } else {
      notify({ title: "HR-808 can't play the beat", body: String(e?.message ?? e), level: "warning" });
    }
    cx.notify();
  }

  // Removes this copy's beat files other than run `keep` (all of them when
  // omitted), and another copy's only once its engine is gone (no alive file),
  // so a second window's drum machine is left alone.
  async clean(keep) {
    const names = await fs.readdir(this.dir).catch(() => []);
    const live = new Set(names.filter((n) => n.endsWith("-alive")).map((n) => n.slice(0, -"alive".length)));
    for (const name of names) {
      const m = /^(beat-([^-]+)-(\d+)-)/.exec(name);
      if (!m) continue;
      const [, prefix, id, run] = m;
      const drop = id === this.id ? String(keep) !== run : !live.has(prefix);
      if (drop) await fs.unlink(`${this.dir}/${name}`).catch(() => {});
    }
  }
}
