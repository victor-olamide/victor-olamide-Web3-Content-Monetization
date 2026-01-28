;; Subscription Contract
;; Allows creators to define tiers and users to subscribe using STX

;; Constants
(define-constant contract-owner tx-sender)
(define-constant day-in-blocks u144) ;; Roughly 144 blocks per day

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-ALREADY-EXISTS (err u101))
(define-constant ERR-NOT-FOUND (err u102))
(define-constant ERR-INVALID-TIER (err u103))
(define-constant ERR-EXPIRED (err u104))

;; Data maps

;; Stores subscription tier details for each creator
(define-map subscription-tiers 
    { creator: principal, tier-id: uint } 
    { price: uint, duration: uint, active: bool }
)

;; Stores active subscription expiry for users
(define-map active-subscriptions 
    { user: principal, creator: principal, tier-id: uint } 
    { expiry: uint }
)

;; Public functions
(define-public (create-tier (tier-id uint) (price uint) (duration uint))
    (begin
        (asserts! (is-none (map-get? subscription-tiers { creator: tx-sender, tier-id: tier-id })) ERR-ALREADY-EXISTS)
        (ok (map-set subscription-tiers 
            { creator: tx-sender, tier-id: tier-id } 
            { price: price, duration: duration, active: true }
        ))
    )
)

(define-public (subscribe (creator principal) (tier-id uint))
    (let (
        (tier (unwrap! (map-get? subscription-tiers { creator: creator, tier-id: tier-id }) ERR-NOT-FOUND))
        (price (get price tier))
        (duration (get duration tier))
        (active (get active tier))
    )
    (begin
        (asserts! active ERR-INVALID-TIER)
        (try! (stx-transfer? price tx-sender creator))
        (ok (map-set active-subscriptions 
            { user: tx-sender, creator: creator, tier-id: tier-id } 
            { expiry: (+ block-height (* duration day-in-blocks)) }
        ))
    ))
)

(define-public (renew-subscription (creator principal) (tier-id uint))
    (let (
        (tier (unwrap! (map-get? subscription-tiers { creator: creator, tier-id: tier-id }) ERR-NOT-FOUND))
        (current-sub (unwrap! (map-get? active-subscriptions { user: tx-sender, creator: creator, tier-id: tier-id }) ERR-NOT-FOUND))
        (price (get price tier))
        (duration (get duration tier))
        (current-expiry (get expiry current-sub))
        (new-start-height (if (> current-expiry block-height) current-expiry block-height))
    )
    (begin
        (asserts! (get active tier) ERR-INVALID-TIER)
        (try! (stx-transfer? price tx-sender creator))
        (ok (map-set active-subscriptions 
            { user: tx-sender, creator: creator, tier-id: tier-id } 
            { expiry: (+ new-start-height (* duration day-in-blocks)) }
        ))
    ))
)

(define-public (update-tier (tier-id uint) (new-price uint) (new-duration uint) (is-active bool))
    (begin
        (asserts! (is-some (map-get? subscription-tiers { creator: tx-sender, tier-id: tier-id })) ERR-NOT-FOUND)
        (ok (map-set subscription-tiers 
            { creator: tx-sender, tier-id: tier-id } 
            { price: new-price, duration: new-duration, active: is-active }
        ))
    )
)

(define-public (deactivate-tier (tier-id uint))
    (let (
        (tier (unwrap! (map-get? subscription-tiers { creator: tx-sender, tier-id: tier-id }) ERR-NOT-FOUND))
    )
    (ok (map-set subscription-tiers 
        { creator: tx-sender, tier-id: tier-id } 
        (merge tier { active: false })
    )))
)

;; Read-only functions
(define-read-only (is-subscribed (user principal) (creator principal) (tier-id uint))
    (let (
        (sub (map-get? active-subscriptions { user: user, creator: creator, tier-id: tier-id }))
    )
    (match sub
        details (>= (get expiry details) block-height)
        false
    ))
)

(define-read-only (get-tier-info (creator principal) (tier-id uint))
    (map-get? subscription-tiers { creator: creator, tier-id: tier-id })
)
