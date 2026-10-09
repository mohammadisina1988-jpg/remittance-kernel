Category: **Builder → Intelligent Contracts**

Title: **RemittanceKernel: Consensus reconciliation with ambiguity witnesses**

Notes / Description:

> RemittanceKernel reconciles bundled remittances against invoices without arbitrarily choosing among equal-value matches. Its fixed publisher supplies commit-pinned prose documents; leader and validators independently fetch full bytes, check SHA-256, and extract exact USD cents, qualifying parties, issued/completed status and binding invoice restrictions. Exact agreement drives a bounded exact-cover search. UNIQUE consumes qualifying document IDs; AMBIGUOUS preserves two competing allocations and consumes none. Unequal totals, impossible restrictions and unresolved amounts remain unconsumed. The append-only ledger retains documents, extractions and allocation witnesses, with source replay and document reuse guards. Tests cover 486 amount/restriction combinations using an independent assignment oracle. Synthetic documents demonstrate documentary reconciliation, not bank-payment truth or money transfer.

Evidence links will be added after public publication and verified deployment. This draft makes no onchain proof claim.
