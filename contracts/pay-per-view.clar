;; Pay-Per-View Contract
;; Allows creators to monetize content through one-time STX payments

;; Constants
(define-constant contract-owner tx-sender)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-ALREADY-EXISTS (err u101))
(define-constant ERR-NOT-FOUND (err u102))
(define-constant ERR-INSUFFICIENT-FUNDS (err u103))
(define-constant ERR-ALREADY-PURCHASED (err u104))

;; Data maps
;; Mapping of content ID to its price and creator
(define-map content-pricing uint { price: uint, creator: principal })

;; Mapping of content ID and user principal to access status
(define-map content-access { content-id: uint, user: principal } bool)

;; Public functions

;; Register new content with a specific price
(define-public (add-content (content-id uint) (price uint))
    (begin
        (asserts! (is-none (map-get? content-pricing content-id)) ERR-ALREADY-EXISTS)
        (print { event: "add-content", content-id: content-id, price: price, creator: tx-sender })
        (ok (map-set content-pricing content-id { price: price, creator: tx-sender }))
    )
)

;; Purchase access to content
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
        (print { event: "purchase-content", content-id: content-id, user: tx-sender, price: price, creator: creator })
        (ok true)
    ))
)

;; Update the price of an existing content piece
(define-public (update-content-price (content-id uint) (new-price uint))
    (let (
        (content (unwrap! (map-get? content-pricing content-id) ERR-NOT-FOUND))
        (creator (get creator content))
    )
    (begin
        (asserts! (is-eq tx-sender creator) ERR-NOT-AUTHORIZED)
        (ok (map-set content-pricing content-id { price: new-price, creator: creator }))
    ))
)

;; Remove content from the platform
(define-public (remove-content (content-id uint))
    (let (
        (content (unwrap! (map-get? content-pricing content-id) ERR-NOT-FOUND))
        (creator (get creator content))
    )
    (begin
        (asserts! (or (is-eq tx-sender creator) (is-eq tx-sender contract-owner)) ERR-NOT-AUTHORIZED)
        (ok (map-delete content-pricing content-id))
    ))
)

;; Read-only functions
(define-read-only (has-access (content-id uint) (user principal))
    (default-to false (map-get? content-access { content-id: content-id, user: user }))
)

(define-read-only (get-content-info (content-id uint))
    (map-get? content-pricing content-id)
)
