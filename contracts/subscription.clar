;; Subscription Contract
;; Allows creators to define tiers and users to subscribe using STX

(define-constant contract-owner tx-sender)
(define-constant day-in-blocks u144) ;; Roughly 144 blocks per day
