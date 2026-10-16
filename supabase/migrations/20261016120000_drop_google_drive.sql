-- Pigxel keeps art only in Pigxel cloud now; Google is used for sign-in
-- alone. The stored Drive refresh tokens go with their table. Tokens Google
-- still honours can be revoked under Google Account → Connections.
drop table public.google_drive_connections;
