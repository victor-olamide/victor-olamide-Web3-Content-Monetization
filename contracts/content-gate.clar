;; content-gate.clar
;; Contract to handle SIP-010 token gating for content

(use-trait sip-010-trait .sip-010-trait.sip-010-trait)
(use-trait sip-009-trait .sip-009-trait.sip-009-trait)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant GATING-TYPE-FT u0)
(define-constant GATING-TYPE-NFT u1)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-WRONG-TOKEN (err u101))
(define-constant ERR-INSUFFICIENT-BALANCE (err u102))
(define-constant ERR-CONTENT-NOT-FOUND (err u103))
(define-constant ERR-INVALID-GATING-TYPE (err u104))
(define-constant ERR-NOT-NFT-OWNER (err u105))

;; Map to store gating rules
;; content-id -> { token-contract: principal, threshold: uint, gating-type: uint }
(define-map gating-rules
    uint
    {
        token-contract: principal,
        threshold: uint,
        gating-type: uint
    }
)

;; Private functions

(define-private (is-creator (content-id uint) (user principal))
    (let
        (
            (content-info (unwrap! (contract-call? .pay-per-view get-content-info content-id) false))
            (creator (get creator content-info))
        )
        (is-eq user creator)
    )
)

;; Management functions

;; Set a gating rule for a specific content
;; Only the creator of the content (defined in pay-per-view) can set the rule
;; The threshold is the minimum amount of tokens required to gain access
(define-public (set-gating-rule (content-id uint) (token-contract principal) (threshold uint) (gating-type uint))
    (begin
        ;; Check if tx-sender is the creator
        (asserts! (is-creator content-id tx-sender) ERR-NOT-AUTHORIZED)
        
        ;; Validate gating type
        (asserts! (or (is-eq gating-type GATING-TYPE-FT) (is-eq gating-type GATING-TYPE-NFT)) ERR-INVALID-GATING-TYPE)
        
        (print { event: "set-gating-rule", content-id: content-id, token-contract: token-contract, threshold: threshold, gating-type: gating-type, creator: tx-sender })
        (ok (map-set gating-rules content-id {
            token-contract: token-contract,
            threshold: threshold,
            gating-type: gating-type
        }))
    )
)

(define-public (delete-gating-rule (content-id uint))
    (begin
        ;; Check if tx-sender is the creator or contract owner
        (asserts! (or (is-creator content-id tx-sender) (is-eq tx-sender contract-owner)) ERR-NOT-AUTHORIZED)
        
        (print { event: "delete-gating-rule", content-id: content-id, creator: tx-sender })
        (ok (map-delete gating-rules content-id))
    )
)

;; Verification function for FT
;; Returns (ok true) if user has access, error otherwise
(define-public (verify-access (content-id uint) (token-trait <sip-010-trait>))
    (let
        (
            (rule (unwrap! (map-get? gating-rules content-id) ERR-NOT-FOUND))
            (user tx-sender)
            (contract-principal (contract-of token-trait))
        )
        ;; Verify it's an FT rule
        (asserts! (is-eq (get gating-type rule) GATING-TYPE-FT) ERR-INVALID-GATING-TYPE)
        
        ;; Verify the passed token trait matches the rule
        (asserts! (is-eq contract-principal (get token-contract rule)) ERR-WRONG-TOKEN)
        
        ;; Check balance
        (let
            (
                (balance (unwrap! (contract-call? token-trait get-balance user) (err u500)))
            )
            (asserts! (>= balance (get threshold rule)) ERR-INSUFFICIENT-BALANCE)
            (print { event: "verify-access-success", content-id: content-id, user: user, token: contract-principal, type: "FT" })
            (ok true)
        )
    )
)

;; Verification function for NFT
;; Returns (ok true) if user owns the specified NFT from the required collection
(define-public (verify-nft-access (content-id uint) (nft-trait <sip-009-trait>) (token-id uint))
    (let
        (
            (rule (unwrap! (map-get? gating-rules content-id) ERR-NOT-FOUND))
            (user tx-sender)
            (contract-principal (contract-of nft-trait))
        )
        ;; Verify it's an NFT rule
        (asserts! (is-eq (get gating-type rule) GATING-TYPE-NFT) ERR-INVALID-GATING-TYPE)
        
        ;; Verify the passed NFT trait matches the rule
        (asserts! (is-eq contract-principal (get token-contract rule)) ERR-WRONG-TOKEN)
        
        ;; Check ownership of the specific token-id
        (let
            (
                (owner (unwrap! (unwrap! (contract-call? nft-trait get-owner token-id) (err u501)) ERR-NOT-FOUND))
            )
            (asserts! (is-eq (some user) owner) ERR-NOT-NFT-OWNER)
            (print { event: "verify-access-success", content-id: content-id, user: user, token: contract-principal, token-id: token-id, type: "NFT" })
            (ok true)
        )
    )
)

;; Read-only functions

(define-read-only (get-gating-rule (content-id uint))
    (map-get? gating-rules content-id)
)

(define-read-only (get-gating-type (content-id uint))
    (match (map-get? gating-rules content-id)
        rule (ok (get gating-type rule))
        ERR-NOT-FOUND
    )
)

(define-read-only (get-required-token (content-id uint))
    (match (map-get? gating-rules content-id)
        rule (ok (get token-contract rule))
        ERR-NOT-FOUND
    )
)
