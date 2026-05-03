;; Pay-Per-View Contract
;; Allows creators to monetize content through one-time STX payments

;; Constants
(define-constant contract-owner tx-sender)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-ALREADY-EXISTS (err u409))
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-INSUFFICIENT-FUNDS (err u402))
(define-constant ERR-ALREADY-PURCHASED (err u403))
(define-constant ERR-INVALID-FEE (err u405))

;; Data vars
(define-data-var platform-fee uint u250) ;; 2.5% in basis points
(define-data-var platform-wallet principal contract-owner)

;; Data maps
;; Mapping of content ID to its price and creator
(define-map content-pricing uint { price: uint, creator: principal, uri: (string-ascii 256) })

;; Mapping of content ID and user principal to access status
(define-map content-access { content-id: uint, user: principal } bool)

;; Public functions

;; Register new content with a specific price and URI
(define-public (add-content (content-id uint) (price uint) (uri (string-ascii 256)))
    (begin
        (asserts! (is-none (map-get? content-pricing content-id)) ERR-ALREADY-EXISTS)
        (print { event: "add-content", content-id: content-id, price: price, creator: tx-sender, uri: uri })
        (ok (map-set content-pricing content-id { price: price, creator: tx-sender, uri: uri }))
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
        (uri (get uri content))
    )
    (begin
        (asserts! (is-eq tx-sender creator) ERR-NOT-AUTHORIZED)
        (ok (map-set content-pricing content-id { price: new-price, creator: creator, uri: uri }))
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

;; Admin functions
(define-public (set-platform-fee (new-fee uint))
    (begin
        (asserts! (is-eq tx-sender contract-owner) ERR-NOT-AUTHORIZED)
        (asserts! (<= new-fee u1000) ERR-INVALID-FEE)
        (ok (var-set platform-fee new-fee))
    )
)

;; Read-only functions
(define-read-only (calculate-platform-fee (amount uint))
    (/ (* amount (var-get platform-fee)) u10000)
)

(define-read-only (has-access (content-id uint) (user principal))
    (default-to false (map-get? content-access { content-id: content-id, user: user }))
)

(define-read-only (get-content-info (content-id uint))
    (map-get? content-pricing content-id)
)

(define-read-only (is-owner (user principal))
    (is-eq user contract-owner)
)
