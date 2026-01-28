;; Subscription Contract
;; Allows creators to define tiers and users to subscribe using STX

(define-constant contract-owner tx-sender)
(define-constant day-in-blocks u144) ;; Roughly 144 blocks per day

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-ALREADY-EXISTS (err u101))
(define-constant ERR-NOT-FOUND (err u102))
(define-constant ERR-INVALID-TIER (err u103))
(define-constant ERR-EXPIRED (err u104))

;; Data maps
(define-map subscription-tiers 
    { creator: principal, tier-id: uint } 
    { price: uint, duration: uint, active: bool }
)

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
