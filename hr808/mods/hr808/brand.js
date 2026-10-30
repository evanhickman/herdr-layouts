import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { theme, run, window, shared, setShared } from "herdr";

// The sidebar's header with the name printed in orange like the panel's maker
// mark, and an orange rule level with the tab bar's so the two read as one line.
// Search and the collapse toggle work as in workspace-chrome.
export class Brand {
  button(t, id, icon, action) {
    return div().id(id).size(26).flex_none().flex().items_center().justify_center().rounded(3).text_color(t.muted)
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click(action)
      .child(svg(`mods/workspace-chrome/${icon}.svg`).size(15));
  }

  render() {
    const t = theme();
    const collapsed = shared("sidebar.collapsed") === true;
    const toggle = () => {
      setShared("sidebar.collapsed", !collapsed);
      run("layout.resize", { id: "sidebar", px: collapsed ? (shared("sidebar.width") ?? 268) : 44 });
    };
    // On the tab keys' line (4px down, 26 tall), as the tab bar lays it out.
    return h_flex().size_full().bg(t.chrome).pl(collapsed ? 6 : 14).pr(10).pt(4).gap(4).items_start()
      .when(window()?.platform === "macos" && !collapsed, (el) => el.pl(80))
      .when(!collapsed, (el) => el
        .child(h_flex().flex_1().min_w(0).h(26).gap(10).items_center()
          .child(div().flex_none().font_family("Futura").font_bold().text_size(21).text_color(t.accent).child("Herdr"))
          .child(div().flex_1().min_w(0).h(1).bg(t.accent)))
        .child(this.button(t, "search", "search", () => run("mod.open", { name: "picker" }))))
      .child(this.button(t, "sidebar-toggle", "sidebar", toggle));
  }
}
