(define-constant contract-owner tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-ALREADY-EXISTS (err u409))
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-INVALID-TIER (err u400))
(define-constant ERR-INVALID-FEE (err u405))

(define-data-var platform-fee uint u250)
(define-data-var platform-wallet principal contract-owner)

(define-map subscription-tiers
    { creator: principal, tier-id: uint }
    { price: uint, duration: uint, active: bool }
)
(define-map active-subscriptions
    { user: principal, creator: principal, tier-id: uint }
    { expiry: uint }
)

(define-public (create-tier (tier-id uint) (price uint) (duration uint))
    (begin
        (asserts! (is-none (map-get? subscription-tiers { creator: tx-sender, tier-id: tier-id })) ERR-ALREADY-EXISTS)
        (print { event: "create-tier", creator: tx-sender, tier-id: tier-id, price: price, duration: duration })
        (ok (map-set subscription-tiers { creator: tx-sender, tier-id: tier-id } { price: price, duration: u144, active: true }))
    )
)

(define-public (subscribe (creator principal) (tier-id uint))
    (let (
        (tier (unwrap! (map-get? subscription-tiers { creator: creator, tier-id: tier-id }) ERR-NOT-FOUND))
        (price (get price tier))
        (fee-amount (/ (* price (var-get platform-fee)) u10000))
        (creator-amount (- price fee-amount))
        (expiry (+ stacks-block-height (* (get duration tier) u144)))
    )
    (begin
        (asserts! (get active tier) ERR-INVALID-TIER)
        (try! (stx-transfer? fee-amount tx-sender (var-get platform-wallet)))
        (try! (stx-transfer? creator-amount tx-sender creator))
        (print { event: "subscribe", user: tx-sender, creator: creator, tier-id: tier-id, expiry: expiry })
        (ok (map-set active-subscriptions { user: tx-sender, creator: creator, tier-id: tier-id } { expiry: expiry }))
    ))
)

(define-public (renew-subscription (creator principal) (tier-id uint))
    (let (
        (tier (unwrap! (map-get? subscription-tiers { creator: creator, tier-id: tier-id }) ERR-NOT-FOUND))
        (current-sub (unwrap! (map-get? active-subscriptions { user: tx-sender, creator: creator, tier-id: tier-id }) ERR-NOT-FOUND))
        (price (get price tier))
        (fee-amount (/ (* price (var-get platform-fee)) u10000))
        (creator-amount (- price fee-amount))
        (current-expiry (get expiry current-sub))
        (new-start (if (> current-expiry stacks-block-height) current-expiry stacks-block-height))
    )
    (begin
        (asserts! (get active tier) ERR-INVALID-TIER)
        (try! (stx-transfer? fee-amount tx-sender (var-get platform-wallet)))
        (try! (stx-transfer? creator-amount tx-sender creator))
        (print { event: "renew-subscription", user: tx-sender, creator: creator, tier-id: tier-id })
        (ok (map-set active-subscriptions { user: tx-sender, creator: creator, tier-id: tier-id } { expiry: (+ new-start (* (get duration tier) u144)) }))
    ))
)

(define-public (update-tier (tier-id uint) (new-price uint) (new-duration uint) (is-active bool))
    (begin
        (asserts! (is-some (map-get? subscription-tiers { creator: tx-sender, tier-id: tier-id })) ERR-NOT-FOUND)
        (ok (map-set subscription-tiers { creator: tx-sender, tier-id: tier-id } { price: new-price, duration: new-duration, active: is-active }))
    )
)

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

(define-read-only (is-subscribed (user principal) (creator principal) (tier-id uint))
    (match (map-get? active-subscriptions { user: user, creator: creator, tier-id: tier-id })
        sub (>= (get expiry sub) stacks-block-height)
        false
    )
)

(define-read-only (get-tier-info (creator principal) (tier-id uint))
    (map-get? subscription-tiers { creator: creator, tier-id: tier-id })
)

(define-read-only (get-platform-fee) (var-get platform-fee))
(define-read-only (get-platform-wallet) (var-get platform-wallet))
