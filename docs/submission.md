Category: **Builder → Intelligent Contracts**

Title: **RemittanceKernel: Consensus reconciliation with ambiguity witnesses**

Notes / Description:

> RemittanceKernel reconciles bundled remittances against indivisible invoices. Leader and validators independently fetch commit-pinned documents, check SHA-256, and extract qualifying parties, issued/completed status, exact USD cents and binding invoice restrictions. Exact agreement drives a bounded exact-cover search. UNIQUE consumes document IDs; AMBIGUOUS records two competing allocations and consumes none. Unequal totals, impossible restrictions and unresolved amounts remain unconsumed. The append-only ledger retains source-linked extractions and witnesses with replay/reuse guards. Five finalized StudioNet MAJORITY_AGREE receipts match onchain state: unique bundled allocation with a forecast excluded, ambiguity, unequal totals, missing amount and blocked restrictions. Includes 35 direct tests and an independent oracle covering 486 configurations. Synthetic documents show reconciliation, not bank settlement or money transfer; the fixed publisher is trusted to assign stable IDs.

Evidence:

- [Repository](https://github.com/mohammadisina1988-jpg/remittance-kernel)
- [GenLayer contract source](https://github.com/mohammadisina1988-jpg/remittance-kernel/blob/main/contracts/remittance_kernel.py)
- [Onchain proofs and scenario transactions](https://github.com/mohammadisina1988-jpg/remittance-kernel/blob/main/proofs/README.md)
- [Deployment transaction](https://explorer-studio.genlayer.com/tx/0x60d76c6d578453ef715b4856e89c091aeba04daf5139c054ce192bef2c0b7590)

StudioNet contract: `0x0D955C282c1F6b718c642Ba0fEc6Db626020c385` (chain 61999; gasless development network).
