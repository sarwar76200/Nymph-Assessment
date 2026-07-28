import {
  Bell,
  CircleHelp,
  FolderOpen,
  LayoutDashboard,
  MessageSquareText,
  MoreHorizontal,
  Settings,
  Sparkles,
} from "lucide-react";

import {
  ConversationCountCard,
  ConversationProvider,
  MessageCountCard,
  RecentConversations,
  StartConversationButton,
} from "@/components/dashboard-conversations";
import {
  DocumentCountCard,
  DocumentProvider,
  RecentDocuments,
} from "@/components/dashboard-documents";
import { AuthGuard } from "@/components/auth-guard";
import { OrganizationProvider } from "@/components/organization-provider";
import {
  OrganizationGate,
  OrganizationSwitcher,
} from "@/components/organization-switcher";
import {
  DashboardUser,
  UserInformationCard,
} from "@/components/dashboard-user";
import { ConversationSearch } from "@/components/conversation-search";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Conversations", icon: MessageSquareText },
  { label: "Documents", icon: FolderOpen },
];

export default function Home() {
  return (
    <AuthGuard>
      <OrganizationProvider>
        <OrganizationGate>
          <ConversationProvider>
            <DocumentProvider>
              <Dashboard />
            </DocumentProvider>
          </ConversationProvider>
        </OrganizationGate>
      </OrganizationProvider>
    </AuthGuard>
  );
}

function Dashboard() {
  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-5 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
            <Sparkles size={18} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-tight">Nymph Support</p>
            <p className="text-[11px] font-medium text-slate-400">Customer portal</p>
          </div>
        </div>

        <OrganizationSwitcher />

        <nav className="mt-6 space-y-1">
          <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
            Workspace
          </p>
          {navItems.map(({ label, icon: Icon, active }) => (
            <a
              key={label}
              href="#"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={18} />
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-auto space-y-1">
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <CircleHelp size={18} />
            Help & support
          </a>
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <Settings size={18} />
            Settings
          </a>
          <DashboardUser variant="profile" />
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Sparkles size={16} />
            </div>
            <span className="font-bold">Nymph</span>
          </div>
          <div className="hidden w-full max-w-sm md:block">
            <ConversationSearch />
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Notifications"
              className="relative flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            >
              <Bell size={17} />
              <span className="absolute top-2 right-2 size-1.5 rounded-full bg-indigo-600 ring-2 ring-white" />
            </button>
            <DashboardUser variant="avatar" />
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-5 py-7 md:px-8 md:py-9">
          <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-1 text-sm font-medium text-indigo-600">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase())}</p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                <DashboardUser variant="greeting" />
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Continue a conversation or start a new chat with an AI support agent.
              </p>
            </div>
            <StartConversationButton />
          </section>

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ConversationCountCard />
            <MessageCountCard />
            <DocumentCountCard />
            <StatCard
              icon={Sparkles}
              label="AI agents available"
              value="3"
              note="Ready to help"
              iconClass="bg-sky-50 text-sky-600"
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
            <RecentConversations />

            <div className="space-y-6">
              <RecentDocuments />
              <UserInformationCard />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

type StatCardProps = {
  icon: typeof MessageSquareText;
  label: string;
  value: string;
  note: string;
  iconClass: string;
};

function StatCard({ icon: Icon, label, value, note, iconClass }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
      <div className="flex items-start justify-between">
        <div className={`flex size-10 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon size={19} />
        </div>
        <MoreHorizontal size={17} className="text-slate-300" />
      </div>
      <p className="mt-5 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-[11px] text-slate-400">{note}</p>
    </article>
  );
}
