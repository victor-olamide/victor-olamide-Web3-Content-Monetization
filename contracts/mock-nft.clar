;; Mock NFT contract for testing SIP-009 gating
(impl-trait .sip-009-trait.sip-009-trait)

(define-non-fungible-token mock-nft uint)

(define-data-var last-token-id uint u0)

(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-NOT-OWNER (err u403))

(define-read-only (get-last-token-id)
    (ok (var-get last-token-id))
)

(define-read-only (get-token-uri (token-id uint))
    (ok none)
)

(define-read-only (get-owner (token-id uint))
    (ok (nft-get-owner? mock-nft token-id))
)

(define-public (transfer (token-id uint) (sender principal) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender sender) ERR-NOT-AUTHORIZED)
        (nft-transfer? mock-nft token-id sender recipient)
    )
)

;; Mint function for testing
(define-public (mint (recipient principal))
    (let
        (
            (token-id (+ (var-get last-token-id) u1))
        )
        (asserts! (is-eq tx-sender (as-contract tx-sender)) (err u403))
        (try! (nft-mint? mock-nft token-id recipient))
        (var-set last-token-id token-id)
        (ok token-id)
    )
)

;; Public mint for testing (simplified)
(define-public (test-mint (recipient principal))
    (let
        (
            (token-id (+ (var-get last-token-id) u1))
        )
        (try! (nft-mint? mock-nft token-id recipient))
        (var-set last-token-id token-id)
        (ok token-id)
    )
)
