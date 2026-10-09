# Boundary and invariants

Caller supplies a commit-pinned source URL and SHA-256 → leader fetches full JSON and interprets every entry → validators independently re-fetch and independently extract every consequential field → exact equality → deterministic complete-allocation search → append immutable result and consume IDs only for UNIQUE.

The fixed publisher supplies raw prose. The contract owns acquisition, consensus, amount normalization, restrictions, exhaustive search and consumption. No frontend, caller or external script supplies authoritative extracted decisions. Workflow expected outputs are external test assertions and are never inputs to the contract.

## Consensus

The source includes a batch label and 2–8 uniquely identified prose entries. The leader checks exact bytes, SHA-256, UTF-8, duplicate JSON keys and source shape. The model determines INVOICE, PAYMENT, IGNORE or UNKNOWN, integer USD cents, and explicit payment restrictions. Eligibility depends on issued/completed status and the fixed buyer/supplier pair. Quotes, forecasts, voids and other parties are negative decisions requiring agreement too.

Each validator acquires the same full source, checks its commitment, extracts independently without seeing the leader extraction in its prompt, and compares normalized ID, role, amount and restriction set exactly. Null restriction means unrestricted; a named set is binding. UNKNOWN has null amount. No confidence score, approximation or tolerance can cross the eligibility/uniqueness decision. Malformed or conflicting model responses fail closed; validator errors reject rather than bless a failure.

Normalization keys entries by their exact source IDs, accepts enum casing and exact digit strings for integer cents, and discards bounded-schema explanation fields. Explicit IGNORE/UNKNOWN entries may omit null-valued fields. Every PAYMENT must provide the non-null string UNRESTRICTED or LIMITED; LIMITED also requires a nonempty allowed invoice set. The stored canonical allowed set is null only after an explicit UNRESTRICTED decision, and independently derived sets must match exactly. The parser never infers unrestricted permission from omission. Duplicate, missing or invented IDs, fractional amounts and positive amounts on unresolved entries remain errors.

Exact agreement still cannot eliminate correlated model mistakes. Public documents are untrusted prompt data. Fixed schema, bounded outputs, independent interpretation and strict comparisons reduce risks; they do not establish physical or financial facts.

## Allocation

For each payment, enumerate nonempty invoice subsets whose integer sum equals the payment amount and whose IDs obey its restrictions. Depth-first search combines disjoint subsets covering all invoices and all payments. Stop after two solutions: this proves ambiguity without enumerating exponentially many equivalent witnesses. A solution assigns each invoice exactly once and conserves each payment and the total. Invoice order and payment order remain tied to source IDs; equal amounts never merge distinct documents.

Tests independently enumerate all invoice-to-payment functions instead of repeating subset-mask search. The receipt verifier applies the same independent formulation to recorded results.

## State and lifecycle

`batches` is bounded, append-only serialized history. `seen[sha256]` blocks exact-source replay. `consumed[id]` changes only after UNIQUE; every qualifying ID must previously be unconsumed. Writes are atomic, so a reused ID or malformed source leaves history unchanged. Every accepted result, including REVIEW and AMBIGUOUS, marks its source seen. A publisher can issue a different committed document to clarify earlier unconsumed entries. There is no arbitrary override and no way to reopen consumed IDs.

This differs from an auction, stable matching or median oracle: there is no price optimization, preference ordering, value aggregation or arbitrary tie-break. Multiple solutions expressly prevent consumption; a second witness is a reason to refuse reconciliation.
