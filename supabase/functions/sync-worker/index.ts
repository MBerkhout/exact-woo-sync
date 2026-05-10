// Phase 1 placeholder — full-sync / long workers run here in Phase 6+.
Deno.serve(() =>
  new Response(JSON.stringify({ ok: true, worker: "sync-worker-stub" }), {
    headers: { "content-type": "application/json" },
  }),
);
