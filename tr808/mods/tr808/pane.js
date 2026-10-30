import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run, theme, home } from "herdr";
import { caps, led, ledState } from "./panel.js";

function folder(cwd) {
  if (!cwd) return "";
  const h = home();
  return cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
}

// A pane's header: the program and its status LED on a cream label (solid while
// focused), the folder, and on hover the shipped pane mod's split/zoom/close.
export class Pane {
  constructor() {
    this.hovered = false;
  }

  button(t, id, icon, command, args) {
    return div().id(id).p(3).rounded(2).text_color(t.dim)
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_click((_e, cx) => { cx.stop_propagation(); run(command, args); })
      .child(svg(`mods/pane/${icon}.svg`).size(13));
  }

  render() {
    const t = theme();
    const p = panes().find((x) => x.pane === props()?.pane);
    if (!p) return div();
    const name = ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
    const pane = p.pane;
    // The status LED rides inside the label, as on the tab keys and PR labels.
    const plate = h_flex().flex_none().max_w(240).h(18).px(6).gap(5).rounded(2).items_center()
      .when(Boolean(p.status), (el) => el.child(led(t, ledState(p.status), 6)))
      .when(p.focused, (el) => el.bg(t.foreground).child(caps(name, 11.5, t.background)))
      .when(!p.focused, (el) => el.border(1).border_color(t.dim).child(caps(name, 11.5, t.muted)));
    return h_flex().id(`pane-head-${pane}`).size_full().px(8).gap(8).items_center()
      .bg(t.background).border_b(1).border_color(t.border).text_size(11.5)
      .on_hover((hovered, cx) => { this.hovered = hovered; cx.notify(); })
      .on_click(() => run("pane.focus", { pane }))
      .child(plate)
      .child(div().flex_1().min_w(0).truncate().text_color(t.muted).child(folder(p.cwd)))
      .when(this.hovered, (el) => el
        .child(this.button(t, `ph-r-${pane}`, "split-right", "pane.split", { direction: "right", pane }))
        .child(this.button(t, `ph-d-${pane}`, "split-down", "pane.split", { direction: "down", pane }))
        .child(this.button(t, `ph-z-${pane}`, p.zoomed ? "unzoom" : "zoom", "pane.zoom", { pane }))
        .child(this.button(t, `ph-x-${pane}`, "close", "pane.close", { pane })));
  }
}
