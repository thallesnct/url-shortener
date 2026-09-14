CREATE TABLE links (
  id           integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code         text NOT NULL UNIQUE,
  original_url text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NULL
);

CREATE TABLE clicks (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  link_id    integer NOT NULL REFERENCES links (id) ON DELETE CASCADE,
  referrer   text NULL,
  user_agent text NULL,
  ip         text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX clicks_link_id_created_at_idx ON clicks (link_id, created_at);
