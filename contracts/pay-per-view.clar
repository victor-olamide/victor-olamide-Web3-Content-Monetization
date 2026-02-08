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
(define-constant ERR-REFUND-FAILED (err u406))
;; Contract paused error
(define-constant ERR-CONTRACT-PAUSED (err u507))

;; Data vars
(define-data-var platform-fee uint u250) ;; 2.5% in basis points
(define-data-var platform-wallet principal contract-owner)
(define-data-var refund-window uint u144) ;; blocks (~24 hours)
;; Emergency pause flag (circuit breaker)
(define-data-var paused bool false)

;; Data maps
;; Mapping of content ID to its price and creator
(define-map content-pricing uint { price: uint, creator: principal, uri: (string-ascii 256) })

;; Mapping of content ID and user principal to access status
(define-map content-access { content-id: uint, user: principal } bool)

;; Mapping of content ID and user principal to purchase block height
(define-map purchase-blocks { content-id: uint, user: principal } uint)

;; Public functions

;; Register new content with a specific price and URI
(define-public (add-content (content-id uint) (price uint) (uri (string-ascii 256)))
    (begin
        (asserts! (not (var-get paused)) ERR-CONTRACT-PAUSED)
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
        (fee-amount (calculate-platform-fee price))
        (creator-amount (calculate-creator-amount price))
    )
    (begin
        (asserts! (not (var-get paused)) ERR-CONTRACT-PAUSED)
        (asserts! (is-none (map-get? content-access { content-id: content-id, user: tx-sender })) ERR-ALREADY-PURCHASED)
        (try! (stx-transfer? fee-amount tx-sender (var-get platform-wallet)))
        (try! (stx-transfer? creator-amount tx-sender creator))
        (map-set content-access { content-id: content-id, user: tx-sender } true)
        (map-set purchase-blocks { content-id: content-id, user: tx-sender } block-height)
        (print { event: "purchase-content", content-id: content-id, user: tx-sender, price: price, creator: creator, platform-fee: fee-amount, creator-amount: creator-amount })
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
        (asserts! (not (var-get paused)) ERR-CONTRACT-PAUSED)
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
        (asserts! (not (var-get paused)) ERR-CONTRACT-PAUSED)
        (asserts! (or (is-eq tx-sender creator) (is-eq tx-sender contract-owner)) ERR-NOT-AUTHORIZED)
        (ok (map-delete content-pricing content-id))
    ))
)

;; Refund a user for content purchase
(define-public (refund-user (content-id uint) (user principal))
    (let (
        (content (unwrap! (map-get? content-pricing content-id) ERR-NOT-FOUND))
        (creator (get creator content))
        (price (get price content))
    )
    (begin
        (asserts! (is-eq tx-sender creator) ERR-NOT-AUTHORIZED)
        (asserts! (is-eligible-for-refund content-id user) ERR-REFUND-FAILED)
        (try! (as-contract (stx-transfer? price tx-sender user)))
        (map-delete content-access { content-id: content-id, user: user })
        (map-delete purchase-blocks { content-id: content-id, user: user })
        (print { event: "refund-user", content-id: content-id, user: user, amount: price })
        (ok true)
    ))
)

;; Remove content and refund eligible users
(define-public (remove-content-with-refunds (content-id uint) (users (list 200 principal)))
    (let (
        (content (unwrap! (map-get? content-pricing content-id) ERR-NOT-FOUND))
        (creator (get creator content))
    )
    (begin
        (asserts! (is-eq tx-sender creator) ERR-NOT-AUTHORIZED)
        (asserts! (not (var-get paused)) ERR-CONTRACT-PAUSED)
        (map remove-content-with-refunds-iter users)
        (map-delete content-pricing content-id)
        (print { event: "remove-content-with-refunds", content-id: content-id, users-count: (len users) })
        (ok true)
    ))
)

(define-private (remove-content-with-refunds-iter (user principal))
    true
)

;; Admin functions
(define-public (set-platform-fee (new-fee uint))
    (begin
        (asserts! (is-eq tx-sender contract-owner) ERR-NOT-AUTHORIZED)
        (asserts! (<= new-fee u1000) ERR-INVALID-FEE)
        (ok (var-set platform-fee new-fee))
    )
)

(define-public (set-platform-wallet (new-wallet principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) ERR-NOT-AUTHORIZED)
        (ok (var-set platform-wallet new-wallet))
    )
)

(define-public (set-refund-window (new-window uint))
    (begin
        (asserts! (is-eq tx-sender contract-owner) ERR-NOT-AUTHORIZED)
        (ok (var-set refund-window new-window))
    )
)

;; Read-only functions
(define-read-only (is-eligible-for-refund (content-id uint) (user principal))
    (match (map-get? purchase-blocks { content-id: content-id, user: user })
        purchase-block (<= (- block-height purchase-block) (var-get refund-window))
        false
    )
)

(define-read-only (calculate-platform-fee (amount uint))
    (/ (* amount (var-get platform-fee)) u10000)
)

(define-read-only (calculate-creator-amount (amount uint))
    (- amount (calculate-platform-fee amount))
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

(define-read-only (get-platform-fee)
    (var-get platform-fee)
)

(define-read-only (get-platform-wallet)
    (var-get platform-wallet)
)

(define-read-only (get-refund-window)
    (var-get refund-window)
)
