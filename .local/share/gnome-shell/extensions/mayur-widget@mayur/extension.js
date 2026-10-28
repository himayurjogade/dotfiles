import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

// Labels for the workspace buttons, one per workspace
const LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

// Pill colours
const ACCENT = '#cba6f7';
const ACTIVE_TEXT = '#1e1e2e';
const INACTIVE_TEXT = '#cdd6f4';
const INACTIVE_BG = 'rgba(30, 30, 46, 0.7)';
const CONTROL_BG = 'rgba(30, 30, 46, 0.7)';

const PILL = 'min-width: 20px; height: 20px; padding: 0 7px; border-radius: 10px; ' +
             'font-size: 12px; text-align: center;';

export default class MayurWidget extends Extension {
  enable() {
    // Transparent top bar
    Main.panel.style = 'background-color: transparent;';

    this._hidden = Main.panel._leftBox.get_children();
    this._hidden.forEach(c => { c.hide(); c.reactive = false; });

    this._box = new St.BoxLayout({
      style: 'spacing: 5px; padding: 0 6px;',
      y_align: Clutter.ActorAlign.CENTER,
    });
    Main.panel._leftBox.insert_child_at_index(this._box, 0);

    const wm = global.workspace_manager;
    this._signals = [
      wm.connect('active-workspace-changed', () => this._render()),
      wm.connect('notify::n-workspaces', () => this._render()),
    ];
    this._render();
  }

  _button(label, style, onClick) {
    const btn = new St.Button({
      label,
      reactive: true,
      can_focus: true,
      track_hover: true,
      y_align: Clutter.ActorAlign.CENTER,
      style,
    });
    btn.connect('clicked', onClick);
    return btn;
  }

  _render() {
    this._box.destroy_all_children();
    const wm = global.workspace_manager;
    const active = wm.get_active_workspace_index();
    const count = wm.get_n_workspaces();

    for (let i = 0; i < count; i++) {
      const ws = wm.get_workspace_by_index(i);
      const isActive = i === active;
      const style = isActive
        ? `${PILL} font-weight: bold; color: ${ACTIVE_TEXT}; background-color: ${ACCENT};`
        : `${PILL} color: ${INACTIVE_TEXT}; background-color: ${INACTIVE_BG};`;

      this._box.add_child(this._button(LABELS[i] ?? String(i + 1), style, () =>
        ws.activate(global.get_current_time())
      ));
    }

    // Remove the last workspace (its windows move to the one before it)
    this._box.add_child(this._button('−',
      `${PILL} color: ${ACCENT}; background-color: ${CONTROL_BG};`,
      () => {
        const n = wm.get_n_workspaces();
        if (n <= 1) return;
        const time = global.get_current_time();
        const last = wm.get_workspace_by_index(n - 1);
        const prev = wm.get_workspace_by_index(n - 2);
        prev.activate(time);
        for (const win of last.list_windows()) {
          win.change_workspace(prev);
        }
        wm.remove_workspace(last, time);
      }
    ));

    // Add a new workspace at the end
    this._box.add_child(this._button('+',
      `${PILL} color: ${ACCENT}; background-color: ${CONTROL_BG};`,
      () => wm.append_new_workspace(true, global.get_current_time())
    ));
  }

  disable() {
    const wm = global.workspace_manager;
    this._signals?.forEach(id => wm.disconnect(id));
    this._signals = null;

    Main.panel.style = null;

    this._box?.destroy();
    this._box = null;
    this._hidden?.forEach(c => { c.show(); c.reactive = true; });
    this._hidden = null;
  }
}
