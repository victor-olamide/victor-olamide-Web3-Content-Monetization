;; content-gate.clar
;; Contract to handle SIP-010 token gating for content

(use-trait sip-010-trait .sip-010-trait.sip-010-trait)

;; Constants
(define-constant contract-owner tx-sender)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-WRONG-TOKEN (err u101))
(define-constant ERR-INSUFFICIENT-BALANCE (err u102))
(define-constant ERR-CONTENT-NOT-FOUND (err u103))

;; Map to store gating rules
;; content-id -> { token-contract: principal, threshold: uint }
(define-map gating-rules
    uint
    {
        token-contract: principal,
        threshold: uint
    }
)

;; Management functions

;; Set a gating rule for a specific content
;; Only the creator of the content (defined in pay-per-view) can set the rule
(define-public (set-gating-rule (content-id uint) (token-contract principal) (threshold uint))
    (let
        (
            (content-info (unwrap! (contract-call? .pay-per-view get-content-info content-id) ERR-CONTENT-NOT-FOUND))
            (creator (get creator content-info))
        )
        ;; Check if tx-sender is the creator
        (asserts! (is-eq tx-sender creator) ERR-NOT-AUTHORIZED)
        
        (print { event: "set-gating-rule", content-id: content-id, token-contract: token-contract, threshold: threshold, creator: tx-sender })
        (ok (map-set gating-rules content-id {
            token-contract: token-contract,
            threshold: threshold
        }))
    )
)

(define-public (delete-gating-rule (content-id uint))
    (let
        (
            (content-info (unwrap! (contract-call? .pay-per-view get-content-info content-id) ERR-CONTENT-NOT-FOUND))
            (creator (get creator content-info))
        )
        ;; Check if tx-sender is the creator or contract owner
        (asserts! (or (is-eq tx-sender creator) (is-eq tx-sender contract-owner)) ERR-NOT-AUTHORIZED)
        
        (print { event: "delete-gating-rule", content-id: content-id, creator: tx-sender })
        (ok (map-delete gating-rules content-id))
    )
)

;; Verification function
;; Returns (ok true) if user has access, error otherwise
(define-public (verify-access (content-id uint) (token-trait <sip-010-trait>))
    (let
        (
            (rule (unwrap! (map-get? gating-rules content-id) ERR-NOT-FOUND))
            (user tx-sender)
            (contract-principal (contract-of token-trait))
        )
        ;; Verify the passed token trait matches the rule
        (asserts! (is-eq contract-principal (get token-contract rule)) ERR-WRONG-TOKEN)
        
        ;; Check balance
        (let
            (
                (balance (unwrap! (contract-call? token-trait get-balance user) (err u500)))
            )
            (asserts! (>= balance (get threshold rule)) ERR-INSUFFICIENT-BALANCE)
            (print { event: "verify-access-success", content-id: content-id, user: user, token: contract-principal })
            (ok true)
        )
    )
)

;; Read-only functions

(define-read-only (get-gating-rule (content-id uint))
    (map-get? gating-rules content-id)
)
