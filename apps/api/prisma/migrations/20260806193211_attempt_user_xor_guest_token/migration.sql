-- Contrainte métier claude.md §3 : userId XOR guestToken non nul.
ALTER TABLE "attempts"
  ADD CONSTRAINT "attempts_user_xor_guest_token" CHECK (
    (num_nonnulls("user_id", "guest_token") = 1)
  );
