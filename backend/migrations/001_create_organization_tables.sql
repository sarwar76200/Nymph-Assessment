-- Stage 1: Create organization tables and one personal organization per user.
-- Keep the application in maintenance mode until all migration stages finish.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organization_memberships (
    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX ix_organization_memberships_user_id
    ON organization_memberships (user_id);

-- This persistent helper table carries the generated mapping between stages.
-- It is removed by the final cleanup migration.
CREATE TABLE _migration_user_organization_map (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL UNIQUE
);

INSERT INTO _migration_user_organization_map (
    user_id,
    organization_id
)
SELECT id, gen_random_uuid()
FROM users;

INSERT INTO organizations (id, name)
SELECT
    mapping.organization_id,
    COALESCE(NULLIF(BTRIM(users.name), ''), users.email)
        || '''s Organization'
FROM _migration_user_organization_map AS mapping
JOIN users ON users.id = mapping.user_id;

INSERT INTO organization_memberships (
    organization_id,
    user_id
)
SELECT organization_id, user_id
FROM _migration_user_organization_map;

COMMIT;
