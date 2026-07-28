import { createContext } from "react";

import { type Organization } from "@/lib/organizations";

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

export const OrganizationContext = createContext<OrganizationContextValue | null>(
    null,
);