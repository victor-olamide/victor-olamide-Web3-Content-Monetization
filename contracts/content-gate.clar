(use-trait sip-010-trait .sip-010-trait.sip-010-trait)
(use-trait sip-009-trait .sip-009-trait.sip-009-trait)

(define-constant contract-owner tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-WRONG-TOKEN (err u400))
(define-constant ERR-INSUFFICIENT-BALANCE (err u403))
(define-constant ERR-CONTENT-NOT-FOUND (err u405))
(define-constant ERR-INVALID-GATING-TYPE (err u406))
(define-constant ERR-NOT-NFT-OWNER (err u407))

(define-map gating-rules uint
    { token-contract: principal, threshold: uint, gating-type: uint }
)

(define-private (is-creator (content-id uint) (user principal))
    (let ((info (unwrap! (contract-call? .pay-per-view get-content-info content-id) false)))
        (is-eq user (get creator info))
    )
)

(define-public (set-gating-rule (content-id uint) (token-contract principal) (threshold uint) (gating-type uint))
    (begin
        (asserts! (is-some (contract-call? .pay-per-view get-content-info content-id)) ERR-CONTENT-NOT-FOUND)
        (asserts! (is-creator content-id tx-sender) ERR-NOT-AUTHORIZED)
        (asserts! (or (is-eq gating-type u0) (is-eq gating-type u1)) ERR-INVALID-GATING-TYPE)
        (ok (map-set gating-rules content-id { token-contract: token-contract, threshold: threshold, gating-type: gating-type }))
    )
)

(define-public (delete-gating-rule (content-id uint))
    (begin
        (asserts! (or (is-creator content-id tx-sender) (is-eq tx-sender contract-owner)) ERR-NOT-AUTHORIZED)
        (ok (map-delete gating-rules content-id))
    )
)

(define-public (verify-access (content-id uint) (token-trait <sip-010-trait>))
    (let ((rule (unwrap! (map-get? gating-rules content-id) ERR-NOT-FOUND)))
    (begin
        (asserts! (is-eq (get gating-type rule) u0) ERR-INVALID-GATING-TYPE)
        (asserts! (is-eq (contract-of token-trait) (get token-contract rule)) ERR-WRONG-TOKEN)
        (let ((balance (unwrap! (contract-call? token-trait get-balance tx-sender) (err u500))))
            (asserts! (>= balance (get threshold rule)) ERR-INSUFFICIENT-BALANCE)
            (ok true)
        )
    ))
)

(define-public (verify-nft-access (content-id uint) (nft-trait <sip-009-trait>) (token-id uint))
    (let ((rule (unwrap! (map-get? gating-rules content-id) ERR-NOT-FOUND)))
    (begin
        (asserts! (is-eq (get gating-type rule) u1) ERR-INVALID-GATING-TYPE)
        (asserts! (is-eq (contract-of nft-trait) (get token-contract rule)) ERR-WRONG-TOKEN)
        (let ((owner (unwrap! (contract-call? nft-trait get-owner token-id) (err u501))))
            (asserts! (is-eq (some tx-sender) owner) ERR-NOT-NFT-OWNER)
            (ok true)
        )
    ))
)

(define-read-only (get-gating-rule (content-id uint))
    (map-get? gating-rules content-id)
)
