;; web3content-nft.clar
;; SIP-009 NFT for the Web3 Content Monetization platform

(impl-trait .sip-009-trait.sip-009-trait)

(define-non-fungible-token web3content-nft uint)

(define-data-var last-token-id uint u0)

(define-constant contract-owner tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-NOT-OWNER      (err u403))

(define-read-only (get-last-token-id)
    (ok (var-get last-token-id))
)

(define-read-only (get-token-uri (token-id uint))
    (ok none)
)

(define-read-only (get-owner (token-id uint))
    (ok (nft-get-owner? web3content-nft token-id))
)

(define-public (transfer (token-id uint) (sender principal) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender sender) ERR-NOT-AUTHORIZED)
        (nft-transfer? web3content-nft token-id sender recipient)
    )
)

(define-public (mint (recipient principal))
    (let
        (
            (token-id (+ (var-get last-token-id) u1))
        )
        (asserts! (is-eq tx-sender contract-owner) ERR-NOT-AUTHORIZED)
        (try! (nft-mint? web3content-nft token-id recipient))
        (var-set last-token-id token-id)
        (ok token-id)
    )
)
