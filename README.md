# RemittanceKernel

Standalone GenLayer primitive for **unique reconciliation of bundled remittances** against invoices. It consumes document IDs only when there is exactly one valid, complete assignment. Equal totals alone do not authorize reconciliation.

The contract independently acquires commit-pinned source documents, uses GenLayer consensus to interpret prose, and searches all valid invoice subsets for each remittance. Ambiguous cases retain two distinct allocation witnesses. Restrictions such as “settle only invoice X” affect the search, not merely the explanation.

- [Contract](contracts/remittance_kernel.py)
- [Architecture and consensus](docs/architecture.md)
- [Direct tests](tests/direct/test_reconciliation.py)
- [Scenario documents](records)
- [Deployment proofs](proofs/README.md)

## Public interface

`RemittanceKernel(publisher, buyer, supplier)` fixes the source repository and qualifying parties. Anyone may call `reconcile_batch(url, sha256)` using a full 40-character commit-pinned raw GitHub URL under that repository's `records/` directory. Caller-provided values never determine amounts, eligibility or restrictions.

`get_state()` returns the append-only batch history with full fetched documents, agreed extractions, totals and allocation witnesses. `is_consumed(document_id)` exposes the global reconciliation guard.

| Result | Meaning | Consumes IDs |
|---|---|---|
| UNIQUE | Exactly one complete allocation | Yes, qualifying invoice/payment IDs |
| AMBIGUOUS | At least two complete allocations | No |
| UNBALANCED | Invoice and payment totals differ | No |
| UNMATCHABLE | Equal totals but no restriction-respecting allocation | No |
| REVIEW | Material source fact is unresolved | No |
| EMPTY | No eligible invoices or no eligible payments | No |

## Reproduce

Python 3.12: `pip install -r requirements.txt`, `genvm-lint download --version v0.2.16`, `genvm-lint check contracts/remittance_kernel.py --json`, `pytest tests/direct -q`.

Node 22: `npm ci`; dispatch the **StudioNet proof** workflow. It creates a dedicated encrypted, gasless development-chain account, invokes GenLayer CLI 0.39.2, preserves receipts, compares deployed source bytes, reads resulting state and consumption flags, then runs `node scripts/verify-proofs.cjs`. Private keystores and passwords are excluded from artifacts and Git.

For interrupted RPC polling, use the recorded deployment hash in `resume_deploy_hash`. If the first scenario was submitted before its receipt could be checked, also supply its exact hash in `resume_combined_hash`. These inputs recover existing transactions; they do not replace unsuccessful consensus decisions with new submissions. A changed contract source requires a fresh deployment.

## Scope and provenance

This is documentary reconciliation, not a bank-payment attestation, money transfer, invoice authenticity check, or delivery proof. A fixed publisher is a trust boundary: content hashes prove fetched bytes, not publisher honesty. Synthetic documents demonstrate the mechanism. Stable document IDs must be assigned honestly by that publisher; renamed duplicates cannot be detected.

USD cents only; positive amounts; 2–8 entries; 24 accepted batches; indivisible invoices; each completed payment must be fully allocated; no partial allocations, refunds or currency conversion. A batch is a closed reconciliation set: UNIQUE is relative to its submitted source document, not all invoices in existence. No owner override or certificate lifecycle exists. New source evidence can resolve an unconsumed ambiguous batch, while consumed IDs remain locked.

The implementation, fixture corpus, solver tests and independent proof oracle are purpose-built. Generic CLI account configuration, workflow and receipt-journaling scaffolding reuse earlier repositories; the exact-cover algorithm itself is established mathematics.
