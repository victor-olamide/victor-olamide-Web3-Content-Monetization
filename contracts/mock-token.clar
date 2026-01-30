;; mock-token.clar
;; A simple SIP-010 token for testing purposes

(impl-trait .sip-010-trait.sip-010-trait)

(define-fungible-token mock-token)

(define-constant contract-owner tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-INVALID-AMOUNT (err u400))

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
        (asserts! (is-eq tx-sender sender) ERR-NOT-AUTHORIZED)
        (try! (ft-transfer? mock-token amount sender recipient))
        (match memo to-print (print to-print) 0x)
        (ok true)
    )
)

(define-read-only (get-name)
    (ok "Mock Token")
)

(define-read-only (get-symbol)
    (ok "MOCK")
)

(define-read-only (get-decimals)
    (ok u6)
)

(define-read-only (get-balance (user principal))
    (ok (ft-get-balance mock-token user))
)

(define-read-only (get-total-supply)
    (ok (ft-get-supply mock-token))
)

(define-read-only (get-token-uri)
    (ok none)
)

;; Mint function for testing
(define-public (mint (amount uint) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) ERR-NOT-AUTHORIZED)
        (asserts! (> amount u0) ERR-INVALID-AMOUNT)
        (ft-mint? mock-token amount recipient)
    )
)
