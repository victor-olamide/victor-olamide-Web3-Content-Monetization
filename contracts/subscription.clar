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
