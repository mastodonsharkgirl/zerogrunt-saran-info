# Review and repairs

## Core review

A separate read-only reviewer inspected the live implementation and reproduced
the following gaps. The implementation was repaired and focused checks rerun:

- Rule revision initially lacked a durable authoritative rule record.
- Candidate digest lacked the end of its effective interval.
- An interrupted admitted request could remain stuck before readback.
- A constant store identifier failed to distinguish separate ERP databases.
- A stored approval missing its expiry could pass an unsafe comparison.
- Corrupt/missing retry timing could bypass backoff or reset the deadline.
- Receipt identifiers were initially shared across different invoices.

Final bounded review found no remaining P0/P1 findings. The receipt-identifier
P2 was subsequently fixed: distinct postings get persistent UUIDs, and duplicate
submissions return the original receipt. The HTTP recording asserts both.
This is a code review of the synthetic experiment, not a security certification.

## Rendered review

An isolated preview on 4388 was reviewed at 320, 360, 390, 768 and 1440 pixels.
Desktop opening/lab, mobile and tablet screenshots were visually inspected.
No document-level horizontal overflow or page/console errors were observed.
Evidence-fetch failure displayed an explicit recovery message. Expanded
evaluation's automated accessibility scan had no violations.

Review found that replaced correction/recovery buttons lost keyboard focus.
The UI now moves focus to the next logical action, and the regression test
uses Enter before checking focused controls.

Presentation Escape returns focus to the opener. Reduced-motion preference
was changed during the active session and navigation remained usable.
Emulated sizes and automated scans do not establish full accessibility or
physical Android/in-app behavior.
