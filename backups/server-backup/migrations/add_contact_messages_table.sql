-- Criar tabela contact_messages
CREATE TABLE IF NOT EXISTS "contact_messages" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "user_id" INTEGER REFERENCES "users" ("id") ON DELETE SET NULL,
  "response_message" TEXT,
  "response_date" TIMESTAMP,
  "responded_by_id" INTEGER REFERENCES "users" ("id") ON DELETE SET NULL
);

-- Índice para pesquisas por status
CREATE INDEX IF NOT EXISTS "idx_contact_messages_status" ON "contact_messages" ("status");

-- Índice para pesquisas por data de criação
CREATE INDEX IF NOT EXISTS "idx_contact_messages_created_at" ON "contact_messages" ("created_at");