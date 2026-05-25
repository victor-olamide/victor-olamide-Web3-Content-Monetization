;; web3content-token.clar
;; SIP-010 fungible token for the Web3 Content Monetization platform

(impl-trait .sip-010-trait.sip-010-trait)

(define-fungible-token web3content-token)

(define-constant contract-owner tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-INVALID-AMOUNT (err u400))

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
        (asserts! (is-eq tx-sender sender) ERR-NOT-AUTHORIZED)
        (try! (ft-transfer? web3content-token amount sender recipient))
        (match memo to-print (print to-print) 0x)
        (ok true)
    )
)

(define-read-only (get-name)
    (ok "Web3Content Token")
)

(define-read-only (get-symbol)
    (ok "W3CT")
)

(define-read-only (get-decimals)
    (ok u6)
)

(define-read-only (get-balance (user principal))
    (ok (ft-get-balance web3content-token user))
)

(define-read-only (get-total-supply)
    (ok (ft-get-supply web3content-token))
)

(define-read-only (get-token-uri)
    (ok none)
)

(define-public (mint (amount uint) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) ERR-NOT-AUTHORIZED)
        (asserts! (> amount u0) ERR-INVALID-AMOUNT)
        (ft-mint? web3content-token amount recipient)
    )
)
