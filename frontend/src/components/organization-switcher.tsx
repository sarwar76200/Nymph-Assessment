"use client";

import {
  AlertCircle,
  Building2,
  Check,
  ChevronDown,
  LoaderCircle,
  Plus,
  X,
} from "lucide-react";
import { FormEvent, Fragment, ReactNode, useState } from "react";
import { createPortal } from "react-dom";

import { useOrganization } from "@/components/organization-provider";

export function OrganizationGate({ children }: { children: ReactNode }) {
  const {
    activeOrganization,
    createOrganization,
    error,
    isLoading,
    isReady,
    reloadOrganizations,
  } = useOrganization();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (!isReady || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa]">
        <LoaderCircle size={28} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!activeOrganization) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            {error ? <AlertCircle size={22} /> : <Building2 size={22} />}
          </div>
          <h1 className="mt-4 text-lg font-bold text-slate-900">
            {error ? "Organizations unavailable" : "Create your workspace"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error ||
              "You do not belong to an organization yet. Create one to start using the dashboard."}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            {error && (
              <button
                type="button"
                onClick={() => void reloadOrganizations()}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Try again
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus size={16} />
              Create organization
            </button>
          </div>
        </section>
        {isCreateOpen && (
          <CreateOrganizationDialog
            createOrganization={createOrganization}
            onClose={() => setIsCreateOpen(false)}
          />
        )}
      </div>
    );
  }

  return <Fragment key={activeOrganization.id}>{children}</Fragment>;
}

export function OrganizationSwitcher() {
  const {
    activeOrganization,
    organizations,
    setActiveOrganization,
    createOrganization,
  } = useOrganization();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (!activeOrganization) {
    return null;
  }

  return (
    <div className="relative mt-5">
      <p className="mb-2 px-2 text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
        Organization
      </p>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left hover:border-indigo-200 hover:bg-indigo-50/50"
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
          <Building2 size={16} />
        </div>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
          {activeOrganization.name}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-slate-400 transition-transform ${
            isMenuOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isMenuOpen && (
        <div
          role="menu"
          className="absolute top-full left-0 z-40 mt-2 w-full rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70"
        >
          <div className="max-h-48 overflow-y-auto">
            {organizations.map((organization) => (
              <button
                type="button"
                role="menuitemradio"
                aria-checked={organization.id === activeOrganization.id}
                key={organization.id}
                onClick={() => {
                  setActiveOrganization(organization.id);
                  setIsMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
              >
                <span className="min-w-0 flex-1 truncate">
                  {organization.name}
                </span>
                {organization.id === activeOrganization.id && (
                  <Check size={15} className="shrink-0 text-indigo-600" />
                )}
              </button>
            ))}
          </div>
          <div className="mt-1 border-t border-slate-100 pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsMenuOpen(false);
                setIsCreateOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
            >
              <Plus size={15} />
              Create organization
            </button>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <CreateOrganizationDialog
          createOrganization={createOrganization}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </div>
  );
}

type CreateOrganizationDialogProps = {
  createOrganization: (name: string) => Promise<unknown>;
  onClose: () => void;
};

function CreateOrganizationDialog({
  createOrganization,
  onClose,
}: CreateOrganizationDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const organizationName = name.trim();
    if (!organizationName) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await createOrganization(organizationName);
      onClose();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create the organization.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-[2px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-organization-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="create-organization-title"
              className="font-semibold text-slate-900"
            >
              Create organization
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Conversations and documents will be kept in this workspace.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close create organization dialog"
            disabled={isSubmitting}
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5">
          <label
            htmlFor="organization-name"
            className="text-sm font-medium text-slate-700"
          >
            Organization name
          </label>
          <input
            id="organization-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={1}
            maxLength={200}
            required
            autoFocus
            placeholder="Acme Support"
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
          />
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="h-10 rounded-lg px-4 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && (
                <LoaderCircle size={15} className="animate-spin" />
              )}
              {isSubmitting ? "Creating..." : "Create organization"}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
