import {
  Bell,
  Bot,
  ChevronRight,
  CircleHelp,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";

import { DashboardUser } from "@/components/dashboard-user";

const conversations = [
  {
    title: "Help with my billing information",
    agent: "Billing Agent",
    preview: "I can help you update your billing details safely...",
    time: "10 min ago",
    status: "Active",
    initials: "BA",
    color: "bg-violet-100 text-violet-700",
  },
  {
    title: "Choosing the right subscription",
    agent: "Plans Agent",
    preview: "Based on what you described, the Pro plan includes...",
    time: "1 hr ago",
    status: "Completed",
    initials: "PA",
    color: "bg-sky-100 text-sky-700",
  },
  {
    title: "Trouble signing in to my account",
    agent: "Account Agent",
    preview: "Let’s check a few common causes after a password reset...",
    time: "Yesterday",
    status: "Active",
    initials: "SA",
    color: "bg-amber-100 text-amber-700",
  },
  {
    title: "How to export my usage report",
    agent: "Product Agent",
    preview: "You can download your monthly report from Settings...",
    time: "Jul 23",
    status: "Completed",
    initials: "PA",
    color: "bg-emerald-100 text-emerald-700",
  },
];

const documents = [
  { name: "Product Guide.pdf", size: "2.4 MB", date: "Jul 24", type: "PDF" },
  { name: "Support FAQ.docx", size: "860 KB", date: "Jul 22", type: "DOCX" },
  { name: "Refund Policy.txt", size: "24 KB", date: "Jul 18", type: "TXT" },
];

const navItems = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Conversations", icon: MessageSquareText },
  { label: "Documents", icon: FolderOpen },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-5 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
            <Sparkles size={18} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-tight">Nymph Support</p>
            <p className="text-[11px] font-medium text-slate-400">AI workspace</p>
          </div>
        </div>

        <nav className="mt-9 space-y-1">
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
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Sparkles size={16} />
            </div>
            <span className="font-bold">Nymph</span>
          </div>
          <div className="relative hidden w-full max-w-sm md:block">
            <Search
              size={16}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <input
              aria-label="Search conversations"
              placeholder="Search conversations..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
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
              <p className="mb-1 text-sm font-medium text-indigo-600">Sunday, July 26</p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                <DashboardUser variant="greeting" />
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Continue a conversation or start a new chat with an AI support agent.
              </p>
            </div>
            <button className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 sm:self-auto">
              <Plus size={17} />
              Start conversation
            </button>
          </section>

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={MessageSquareText}
              label="Total conversations"
              value="24"
              note="+4 this week"
              iconClass="bg-indigo-50 text-indigo-600"
            />
            <StatCard
              icon={Bot}
              label="Messages exchanged"
              value="148"
              note="+18 this week"
              iconClass="bg-amber-50 text-amber-600"
            />
            <StatCard
              icon={FileText}
              label="Documents"
              value="12"
              note="+3 this month"
              iconClass="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              icon={Sparkles}
              label="AI agents available"
              value="3"
              note="Ready to help"
              iconClass="bg-sky-50 text-sky-600"
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 md:px-6">
                <div>
                  <h2 className="font-semibold">Recent conversations</h2>
                  <p className="mt-0.5 text-xs text-slate-400">Your latest chats with AI agents</p>
                </div>
                <a
                  href="#"
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  View all <ChevronRight size={14} />
                </a>
              </div>
              <div className="divide-y divide-slate-100">
                {conversations.map((conversation) => (
                  <article
                    key={conversation.title}
                    className="flex items-start gap-3 px-5 py-4 transition hover:bg-slate-50/70 md:items-center md:px-6"
                  >
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${conversation.color}`}
                    >
                      {conversation.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-slate-800">
                          {conversation.title}
                        </h3>
                        <span
                          className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline ${
                            conversation.status === "Active"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {conversation.status}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        <span className="font-medium text-slate-500">{conversation.agent}</span>
                        {" · "}
                        {conversation.preview}
                      </p>
                    </div>
                    <time className="shrink-0 text-[11px] text-slate-400">{conversation.time}</time>
                  </article>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="font-semibold">Recent documents</h2>
                    <p className="mt-0.5 text-xs text-slate-400">Knowledge added recently</p>
                  </div>
                  <button
                    aria-label="Add document"
                    className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="divide-y divide-slate-100 px-5">
                  {documents.map((document) => (
                    <article key={document.name} className="flex items-center gap-3 py-3.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <FileText size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-medium text-slate-700">{document.name}</h3>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {document.type} · {document.size}
                        </p>
                      </div>
                      <time className="text-[11px] text-slate-400">{document.date}</time>
                    </article>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-5 text-white shadow-sm">
                <div className="absolute -top-10 -right-8 size-36 rounded-full bg-indigo-500/20 blur-2xl" />
                <div className="relative">
                  <div className="mb-4 flex size-9 items-center justify-center rounded-lg bg-white/10">
                    <Sparkles size={17} className="text-indigo-300" />
                  </div>
                  <h2 className="text-sm font-semibold">Get better answers from your AI agents</h2>
                  <p className="mt-1.5 max-w-sm text-xs leading-5 text-slate-400">
                    Add relevant documents so your support agents can give you more useful answers.
                  </p>
                  <button className="mt-4 text-xs font-semibold text-indigo-300 hover:text-indigo-200">
                    Upload a document →
                  </button>
                </div>
              </div>
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
