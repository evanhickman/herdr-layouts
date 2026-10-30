import { div } from "gpui-kit";
import { h_flex } from "gpui-base";

// The 808's panel lettering ("BassDrum", "LowConga"): capitals and the first
// letter of each word full size, everything else as smaller capitals.
export function caps(text, big, color) {
  const small = Math.round(big * 0.72 * 10) / 10;
  const runs = [];
  let word = true;
  for (const ch of String(text ?? "")) {
    const letter = /\p{L}/u.test(ch);
    const size = (letter && (word || ch !== ch.toLowerCase())) || /\p{N}/u.test(ch) ? big : small;
    if (runs.length && runs.at(-1).size === size) runs.at(-1).text += ch.toUpperCase();
    else runs.push({ size, text: ch.toUpperCase() });
    word = !letter && !/\p{N}/u.test(ch);
  }
  return h_flex().min_w(0).overflow_hidden().items_baseline().text_color(color).whitespace_nowrap()
    .children(runs.map((r) => div().flex_none().text_size(r.size).child(r.text)));
}

// Lettering on colored keys and the gray panel.
export const INK = "#111111";

// Off LEDs are dark red glass; lit ones sit in a black socket so they read on a
// key of their own color. LEDs hold steady: working and blocked can last for
// hours, and a looping blink would repaint the window the whole time.
const OFF = "#3a1611";

export function led(t, state, size = 7) {
  const color = { blocked: t.blocked, working: t.working, done: t.done }[state];
  // Off or lit, the same room, so text beside it doesn't shift when it lights.
  const socket = div().size(size + 6).flex_none().flex().items_center().justify_center().rounded_full();
  if (!color) return socket.child(div().size(size).rounded_full().bg(OFF).border(1).border_color(t.border));
  return socket.bg("#000000").child(mark(state, color, size + 2));
}

// Red and orange are too close to tell apart at this size, so each lit state
// has its own shape: working a dot, blocked a square, done a ring. The same LED
// is drawn in tr808-spaces and tr808-agents (mods can't share code): change all three.
export function mark(state, color, size) {
  if (state === "blocked") return div().size(size).bg(color);
  if (state === "done") return div().size(size).rounded_full().border(1.5).border_color(color);
  return div().size(size).rounded_full().bg(color);
}

export function ledState(status) {
  return status === "blocked" || status === "working" || status === "done" ? status : "off";
}
