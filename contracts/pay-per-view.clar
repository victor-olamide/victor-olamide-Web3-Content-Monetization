;; Pay-Per-View Contract
;; Allows creators to monetize content through one-time STX payments

(define-constant contract-owner tx-sender)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-ALREADY-EXISTS (err u101))
(define-constant ERR-NOT-FOUND (err u102))
(define-constant ERR-INSUFFICIENT-FUNDS (err u103))
(define-constant ERR-ALREADY-PURCHASED (err u104))

;; Data maps
(define-map content-pricing uint { price: uint, creator: principal })
(define-map content-access { content-id: uint, user: principal } bool)

;; Public functions
(define-public (add-content (content-id uint) (price uint))
    (begin
        (asserts! (is-none (map-get? content-pricing content-id)) ERR-ALREADY-EXISTS)
        (ok (map-set content-pricing content-id { price: price, creator: tx-sender }))
    )
)

(define-public (purchase-content (content-id uint))
    (let (
        (content (unwrap! (map-get? content-pricing content-id) ERR-NOT-FOUND))
        (price (get price content))
        (creator (get creator content))
    )
    (begin
        (asserts! (is-none (map-get? content-access { content-id: content-id, user: tx-sender })) ERR-ALREADY-PURCHASED)
        (try! (stx-transfer? price tx-sender creator))
        (map-set content-access { content-id: content-id, user: tx-sender } true)
        (ok true)
    ))
)
