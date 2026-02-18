;; content-gate-v2.clar
;; Upgraded version of content-gate.clar with enhanced features

(use-trait sip-010-trait .sip-010-trait.sip-010-trait)
(use-trait sip-009-trait .sip-009-trait.sip-009-trait)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant GATING-TYPE-FT u0)
(define-constant GATING-TYPE-NFT u1)
(define-constant GATING-TYPE-STACKS u2) ;; New: Direct STX gating
(define-constant CONTRACT-VERSION "2.0.0")

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-NOT-FOUND (err u404))
(define-constant ERR-WRONG-TOKEN (err u400))
(define-constant ERR-INSUFFICIENT-BALANCE (err u403))
(define-constant ERR-CONTENT-NOT-FOUND (err u404))
(define-constant ERR-INVALID-GATING-TYPE (err u400))
(define-constant ERR-NOT-NFT-OWNER (err u403))
(define-constant ERR-UPGRADE-IN-PROGRESS (err u409))
(define-constant ERR-INVALID-VERSION (err u400))

;; Enhanced gating rules with new features
(define-map gating-rules
    uint
    {
        token-contract: (optional principal),
        threshold: uint,
        gating-type: uint,
        is-active: bool,
        created-at: uint,
        updated-at: uint,
        access-count: uint,
        category: (optional (string-ascii 64)),
        tags: (list 10 (string-ascii 32))
    }
)

;; New data structures for V2
(define-map content-analytics
    uint
    {
        total-access: uint,
        unique-users: uint,
        revenue-generated: uint,
        last-access: uint
    }
)

(define-map user-access-history
    { user: principal, content-id: uint }
    {
        first-access: uint,
        last-access: uint,
        access-count: uint,
        total-spent: uint
    }
)

;; Contract upgrade state
(define-data-var upgrade-in-progress bool false)
(define-data-var current-version (string-ascii 10) CONTRACT-VERSION)

;; Migration data for upgrade compatibility
(define-map legacy-gating-rules
    uint
    {
        token-contract: principal,
        threshold: uint,
        gating-type: uint
    }
)

;; Private functions

(define-private (is-creator (content-id uint) (user principal))
    (let
        (
            (content-info (unwrap! (contract-call? .pay-per-view get-content-info content-id) false))
            (creator (get creator content-info))
        )
        (is-eq user creator)
    )
)

(define-private (is-contract-owner)
    (is-eq tx-sender contract-owner)
)

(define-private (validate-gating-type (gating-type uint))
    (and (>= gating-type GATING-TYPE-FT) (<= gating-type GATING-TYPE-STACKS))
)

(define-private (migrate-legacy-rule (content-id uint))
    (let
        (
            (legacy-rule (unwrap! (map-get? legacy-gating-rules content-id) false))
        )
        (if (is-some (map-get? gating-rules content-id))
            true ;; Already migrated
            (let
                (
                    (new-rule {
                        token-contract: (some (get token-contract legacy-rule)),
                        threshold: (get threshold legacy-rule),
                        gating-type: (get gating-type legacy-rule),
                        is-active: true,
                        created-at: block-height,
                        updated-at: block-height,
                        access-count: u0,
                        category: none,
                        tags: (list)
                    })
                )
                (map-set gating-rules content-id new-rule)
            )
        )
    )
)

;; Management functions

;; Set a gating rule for a specific content (V2 enhanced)
(define-public (set-gating-rule
    (content-id uint)
    (token-contract (optional principal))
    (threshold uint)
    (gating-type uint)
    (category (optional (string-ascii 64)))
    (tags (list 10 (string-ascii 32)))
)
    (begin
        (asserts! (is-contract-owner) ERR-NOT-AUTHORIZED)
        (asserts! (validate-gating-type gating-type) ERR-INVALID-GATING-TYPE)
        (asserts! (not (var-get upgrade-in-progress)) ERR-UPGRADE-IN-PROGRESS)

        ;; Migrate legacy data if needed
        (migrate-legacy-rule content-id)

        (map-set gating-rules content-id {
            token-contract: token-contract,
            threshold: threshold,
            gating-type: gating-type,
            is-active: true,
            created-at: block-height,
            updated-at: block-height,
            access-count: u0,
            category: category,
            tags: tags
        })

        (print {
            event: "gating-rule-set",
            content-id: content-id,
            gating-type: gating-type,
            threshold: threshold
        })

        (ok true)
    )
)

;; Update existing gating rule
(define-public (update-gating-rule
    (content-id uint)
    (new-threshold uint)
    (new-category (optional (string-ascii 64)))
    (new-tags (list 10 (string-ascii 32)))
)
    (let
        (
            (existing-rule (unwrap! (map-get? gating-rules content-id) ERR-NOT-FOUND))
        )
        (asserts! (is-contract-owner) ERR-NOT-AUTHORIZED)
        (asserts! (get is-active existing-rule) ERR-NOT-FOUND)

        (map-set gating-rules content-id (merge existing-rule {
            threshold: new-threshold,
            updated-at: block-height,
            category: new-category,
            tags: new-tags
        }))

        (print {
            event: "gating-rule-updated",
            content-id: content-id,
            new-threshold: new-threshold
        })

        (ok true)
    )
)

;; Deactivate gating rule
(define-public (deactivate-gating-rule (content-id uint))
    (let
        (
            (existing-rule (unwrap! (map-get? gating-rules content-id) ERR-NOT-FOUND))
        )
        (asserts! (is-contract-owner) ERR-NOT-AUTHORIZED)

        (map-set gating-rules content-id (merge existing-rule {
            is-active: false,
            updated-at: block-height
        }))

        (print {
            event: "gating-rule-deactivated",
            content-id: content-id
        })

        (ok true)
    )
)

;; Check access for content (V2 enhanced)
(define-public (check-access (content-id uint) (user principal))
    (let
        (
            (rule (unwrap! (map-get? gating-rules content-id) ERR-NOT-FOUND))
            (has-access (check-token-access content-id user rule))
        )
        (if has-access
            (begin
                ;; Update analytics
                (update-content-analytics content-id user)
                (ok true)
            )
            (err ERR-INSUFFICIENT-BALANCE)
        )
    )
)

;; Internal function to check token access
(define-private (check-token-access (content-id uint) (user principal) (rule {
    token-contract: (optional principal),
    threshold: uint,
    gating-type: uint,
    is-active: bool,
    created-at: uint,
    updated-at: uint,
    access-count: uint,
    category: (optional (string-ascii 64)),
    tags: (list 10 (string-ascii 32))
}))
    (if (not (get is-active rule))
        false ;; Rule is not active
        (let
            (
                (gating-type (get gating-type rule))
            )
            (if (is-eq gating-type GATING-TYPE-STACKS)
                ;; Direct STX balance check
                (>= (get-stx-balance user) (get threshold rule))
                ;; Token-based gating (FT or NFT)
                (if (is-some (get token-contract rule))
                    (let
                        (
                            (token-contract (unwrap-panic (get token-contract rule)))
                        )
                        (if (is-eq gating-type GATING-TYPE-FT)
                            ;; FT balance check
                            (>= (unwrap-panic (contract-call? token-contract get-balance user)) (get threshold rule))
                            ;; NFT ownership check
                            (is-some (contract-call? token-contract get-owner (get threshold rule)))
                        )
                    )
                    false
                )
            )
        )
    )
)

;; Update content analytics
(define-private (update-content-analytics (content-id uint) (user principal))
    (let
        (
            (current-analytics (default-to {
                total-access: u0,
                unique-users: u0,
                revenue-generated: u0,
                last-access: block-height
            } (map-get? content-analytics content-id)))
            (user-history-key { user: user, content-id: content-id })
            (current-history (default-to {
                first-access: block-height,
                last-access: block-height,
                access-count: u0,
                total-spent: u0
            } (map-get? user-access-history user-history-key)))
        )
        ;; Update content analytics
        (map-set content-analytics content-id {
            total-access: (+ (get total-access current-analytics) u1),
            unique-users: (get unique-users current-analytics), ;; Would need more complex logic for unique count
            revenue-generated: (get revenue-generated current-analytics),
            last-access: block-height
        })

        ;; Update user history
        (map-set user-access-history user-history-key {
            first-access: (get first-access current-history),
            last-access: block-height,
            access-count: (+ (get access-count current-history) u1),
            total-spent: (get total-spent current-history)
        })
    )
)

;; Contract upgrade functions

;; Initiate upgrade process
(define-public (start-upgrade)
    (begin
        (asserts! (is-contract-owner) ERR-NOT-AUTHORIZED)
        (asserts! (not (var-get upgrade-in-progress)) ERR-UPGRADE-IN-PROGRESS)

        (var-set upgrade-in-progress true)
        (print { event: "upgrade-started", version: CONTRACT-VERSION })
        (ok true)
    )
)

;; Complete upgrade process
(define-public (complete-upgrade)
    (begin
        (asserts! (is-contract-owner) ERR-NOT-AUTHORIZED)
        (asserts! (var-get upgrade-in-progress) ERR-NOT-AUTHORIZED)

        (var-set upgrade-in-progress false)
        (print { event: "upgrade-completed", version: CONTRACT-VERSION })
        (ok true)
    )
)

;; Migrate data from legacy contract
(define-public (migrate-from-legacy (legacy-contract principal) (content-ids (list 100 uint)))
    (begin
        (asserts! (is-contract-owner) ERR-NOT-AUTHORIZED)
        (asserts! (var-get upgrade-in-progress) ERR-UPGRADE-IN-PROGRESS)

        (try! (migrate-gating-rules legacy-contract content-ids))
        (print { event: "migration-completed", migrated-count: (len content-ids) })
        (ok true)
    )
)

;; Internal migration function
(define-private (migrate-gating-rules (legacy-contract principal) (content-ids (list 100 uint)))
    (begin
        (fold migrate-single-rule content-ids { migrated: u0, errors: u0 })
        (ok true)
    )
)

;; Migrate single rule
(define-private (migrate-single-rule (content-id uint) (accumulator { migrated: uint, errors: uint }))
    (let
        (
            (legacy-rule (contract-call? legacy-contract get-gating-rule content-id))
        )
        (if (is-ok legacy-rule)
            (let
                (
                    (rule-data (unwrap-panic legacy-rule))
                )
                (map-set legacy-gating-rules content-id rule-data)
                (migrate-legacy-rule content-id)
                { migrated: (+ (get migrated accumulator) u1), errors: (get errors accumulator) }
            )
            { migrated: (get migrated accumulator), errors: (+ (get errors accumulator) u1) }
        )
    )
)

;; Read-only functions

;; Get gating rule
(define-read-only (get-gating-rule (content-id uint))
    (map-get? gating-rules content-id)
)

;; Get content analytics
(define-read-only (get-content-analytics (content-id uint))
    (map-get? content-analytics content-id)
)

;; Get user access history
(define-read-only (get-user-access-history (user principal) (content-id uint))
    (map-get? user-access-history { user: user, content-id: content-id })
)

;; Get contract version
(define-read-only (get-version)
    (var-get current-version)
)

;; Check if upgrade is in progress
(define-read-only (is-upgrade-in-progress)
    (var-get upgrade-in-progress)
)

;; Get legacy rule (for migration verification)
(define-read-only (get-legacy-rule (content-id uint))
    (map-get? legacy-gating-rules content-id)
)