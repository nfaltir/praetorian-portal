import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";

/*
  Portal pages render on the server in tens of milliseconds, so a click
  waits for the finished page instead of flashing a loading skeleton.
  (React keeps any skeleton on screen for at least 300ms, which made
  every navigation slower than the page itself.)
  User-specific shell parts still stream in behind their own Suspense
  boundaries on the first load.
*/
export const instant = false;

export default function PortalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-panel px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="main" className="flex-1 px-4 pt-2 pb-10 sm:px-6 lg:px-8 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}