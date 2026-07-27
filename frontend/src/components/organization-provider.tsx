"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";

import { clearSession, getSessionToken } from "@/lib/auth";
import {
  clearStoredOrganizationId,
  createOrganization as createOrganizationRequest,
  getStoredOrganizationId,
  listOrganizations,
  Organization,
  OrganizationApiError,
  storeOrganizationId,
} from "@/lib/organizations";

type OrganizationContextValue = {
  organizations: Organization[];
  activeOrganization: Organization | null;
  activeOrganizationId: string | null;
  isLoading: boolean;
  isReady: boolean;
  error: string;
  setActiveOrganization: (organizationId: string) => void;
  createOrganization: (name: string) => Promise<Organization>;
  reloadOrganizations: () => Promise<void>;
  handleOrganizationForbidden: () => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(
  null,
);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState("");

  const reloadOrganizations = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      clearSession();
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const nextOrganizations = await listOrganizations(token);
      const storedOrganizationId = getStoredOrganizationId();
      const nextActiveOrganization =
        nextOrganizations.find(
          (organization) => organization.id === storedOrganizationId,
        ) ?? nextOrganizations[0];

      setOrganizations(nextOrganizations);
      setActiveOrganizationId(nextActiveOrganization?.id ?? null);

      if (nextActiveOrganization) {
        storeOrganizationId(nextActiveOrganization.id);
      } else {
        clearStoredOrganizationId();
      }
    } catch (requestError) {
      if (
        requestError instanceof OrganizationApiError &&
        requestError.status === 401
      ) {
        clearSession();
        return;
      }

      setOrganizations([]);
      setActiveOrganizationId(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load organizations.",
      );
    } finally {
      setIsLoading(false);
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void reloadOrganizations();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [reloadOrganizations]);

  const setActiveOrganization = useCallback(
    (organizationId: string) => {
      if (
        organizationId === activeOrganizationId ||
        !organizations.some(
          (organization) => organization.id === organizationId,
        )
      ) {
        return;
      }

      storeOrganizationId(organizationId);
      setActiveOrganizationId(organizationId);
    },
    [activeOrganizationId, organizations],
  );

  const createOrganization = useCallback(
    async (name: string) => {
      const token = getSessionToken();
      if (!token) {
        clearSession();
        throw new Error("Your session has expired.");
      }

      try {
        const organization = await createOrganizationRequest(
          token,
          name.trim(),
        );
        setOrganizations((currentOrganizations) =>
          [...currentOrganizations, organization].sort((first, second) =>
            first.name.localeCompare(second.name),
          ),
        );
        storeOrganizationId(organization.id);
        setActiveOrganizationId(organization.id);
        setError("");
        return organization;
      } catch (requestError) {
        if (
          requestError instanceof OrganizationApiError &&
          requestError.status === 401
        ) {
          clearSession();
        }
        throw requestError;
      }
    },
    [],
  );

  const activeOrganization = useMemo(
    () =>
      organizations.find(
        (organization) => organization.id === activeOrganizationId,
      ) ?? null,
    [activeOrganizationId, organizations],
  );

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        activeOrganization,
        activeOrganizationId,
        isLoading,
        isReady,
        error,
        setActiveOrganization,
        createOrganization,
        reloadOrganizations,
        handleOrganizationForbidden: reloadOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error(
      "Organization components require OrganizationProvider.",
    );
  }

  return context;
}
