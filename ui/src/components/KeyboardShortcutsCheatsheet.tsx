import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { t } from "../locales";

interface ShortcutEntry {
  keys: string[];
  labelKey: string;
}

interface ShortcutSection {
  titleKey: string;
  shortcuts: ShortcutEntry[];
}

const sections: ShortcutSection[] = [
  {
    titleKey: "shortcuts.inbox",
    shortcuts: [
      { keys: ["j"], labelKey: "shortcuts.moveDown" },
      { keys: ["↓"], labelKey: "shortcuts.moveDown" },
      { keys: ["k"], labelKey: "shortcuts.moveUp" },
      { keys: ["↑"], labelKey: "shortcuts.moveUp" },
      { keys: ["←"], labelKey: "shortcuts.collapseGroup" },
      { keys: ["→"], labelKey: "shortcuts.expandGroup" },
      { keys: ["Enter"], labelKey: "shortcuts.openItem" },
      { keys: ["a"], labelKey: "shortcuts.archiveItem" },
      { keys: ["y"], labelKey: "shortcuts.archiveItem" },
      { keys: ["r"], labelKey: "shortcuts.markAsRead" },
      { keys: ["U"], labelKey: "shortcuts.markAsUnread" },
    ],
  },
  {
    titleKey: "shortcuts.issueDetail",
    shortcuts: [
      { keys: ["y"], labelKey: "shortcuts.quickArchive" },
      { keys: ["g", "i"], labelKey: "shortcuts.goToInbox" },
      { keys: ["g", "c"], labelKey: "shortcuts.focusComposer" },
    ],
  },
  {
    titleKey: "shortcuts.global",
    shortcuts: [
      { keys: ["/"], labelKey: "shortcuts.search" },
      { keys: ["c"], labelKey: "shortcuts.newIssue" },
      { keys: ["["], labelKey: "shortcuts.toggleSidebar" },
      { keys: ["]"], labelKey: "shortcuts.togglePanel" },
      { keys: ["?"], labelKey: "shortcuts.showShortcuts" },
    ],
  },
];

function KeyCap({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium text-foreground shadow-[0_1px_0_1px_hsl(var(--border))]">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsCheatsheetContent() {
  return (
    <>
      <div className="divide-y divide-border border-t border-border">
        {sections.map((section) => (
          <div key={section.titleKey} className="px-5 py-3">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t(section.titleKey)}
            </h3>
            <div className="space-y-1.5">
              {section.shortcuts.map((shortcut) => (
                <div
                  key={shortcut.labelKey + shortcut.keys.join()}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-sm text-foreground/90">{t(shortcut.labelKey)}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, i) => (
                      <span key={key} className="flex items-center gap-1">
                        {i > 0 && <span className="text-xs text-muted-foreground">{t("shortcuts.then")}</span>}
                        <KeyCap>{key}</KeyCap>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-5 py-3">
        <p className="text-xs text-muted-foreground">
          {t("shortcuts.pressEsc")} <KeyCap>Esc</KeyCap> {t("shortcuts.toClose")} &middot; {t("shortcuts.disabledInFields")}
        </p>
      </div>
    </>
  );
}

export function KeyboardShortcutsCheatsheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden" showCloseButton={false}>
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">{t("shortcuts.title")}</DialogTitle>
        </DialogHeader>
        <KeyboardShortcutsCheatsheetContent />
      </DialogContent>
    </Dialog>
  );
}
