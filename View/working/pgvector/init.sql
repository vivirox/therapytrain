-- Create user
-- see https://stackoverflow.com/questions/8092086/create-postgresql-role-user-if-it-doesnt-exist
DO  
$body$
BEGIN
    CREATE ROLE my_user LOGIN PASSWORD 'my_password';
EXCEPTION WHEN others THEN
    RAISE NOTICE 'my_user role exists, not re-creating';
END
$body$;

-- Create extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table
CREATE TABLE IF NOT EXISTS embeddings (
    id bigserial PRIMARY KEY, 
    tenant_guid text,
    tenant_name text,
    bucket_guid text,
    bucket_name text,
    object_guid text,
    object_key text,
    object_version text,
    model text,
    embedding vector(384),
    createdutc timestamptz DEFAULT now()
);
