import { API_URL } from "@/lib/auth";

export const ACTIVE_ORGANIZATION_STORAGE_KEY = "active_organization_id";

export type Organization = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type ApiError = {
  detail?: unknown;
};

export function organizationApiUrl(
  organizationId: string,
  resource: string,
): string {
  const normalizedResource = resource.startsWith("/")
    ? resource
    : `/${resource}`;

  return `${API_URL}/api/v1/organizations/${organizationId}${normalizedResource}`;
}

export function getStoredOrganizationId(): string | null {
  return window.localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
}

export function storeOrganizationId(organizationId: string): void {
  window.localStorage.setItem(
    ACTIVE_ORGANIZATION_STORAGE_KEY,
    organizationId,
  );
}

export function clearStoredOrganizationId(): void {
  window.localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
}

export async function listOrganizations(
  token: string,
): Promise<Organization[]> {
  const response = await fetch(`${API_URL}/api/v1/organizations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new OrganizationApiError(
      response.status,
      await readErrorMessage(response, "Unable to load organizations."),
    );
  }

  return (await response.json()) as Organization[];
}

export async function createOrganization(
  token: string,
  name: string,
): Promise<Organization> {
  const response = await fetch(`${API_URL}/api/v1/organizations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new OrganizationApiError(
      response.status,
      await readErrorMessage(response, "Unable to create the organization."),
    );
  }

  return (await response.json()) as Organization;
}

export class OrganizationApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "OrganizationApiError";
  }
}

async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const payload = (await response.json().catch(() => null)) as ApiError | null;
  return typeof payload?.detail === "string" ? payload.detail : fallback;
}
