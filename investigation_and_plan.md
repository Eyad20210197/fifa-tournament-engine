# Investigation Report & Implementation Plan

This document outlines the findings from the project investigation and provides a strategic plan for implementing the requested features.

---

### 🔎 SYSTEM ARCHITECTURE SUMMARY

*   **Project Structure**: The system is a modular monolith with a distinct frontend and backend.
*   **Frontend**: A React application built with Vite and styled with TailwindCSS. It communicates with the backend via a REST API. Key services like `tournamentService.js` abstract API interactions. State management appears to be handled via React context (`authContext.js`) and component-level state, with some shared state using a simple store pattern (`tournamentStore.js`).
*   **Backend**: A Node.js application using the Express framework. It follows a modular pattern, with business logic separated by domain (e.g., `tournaments`, `auth`, `users`). It serves a REST API consumed by the frontend.
*   **Database Interaction**: The backend connects to a PostgreSQL database (prepared for Neon serverless) using the `pg` (node-postgres) library. There is no ORM; all database queries are raw SQL, which are co-located with the routing logic in the module's `.routes.js` file. A utility `withTransaction` is available and used for complex writes, ensuring atomicity.
*   **Real-time**: The Ably service is integrated for real-time updates (e.g., score changes, match status), publishing events from the backend to which the frontend can subscribe.
*   **Security**: API endpoints are secured using JWTs (`authenticate` middleware) and role-based access control (`authorize` middleware for 'ADMIN'/'STAFF' roles). Input validation is handled robustly using `zod`.

### 📊 DATABASE ANALYSIS

The following tables are central to tournament management. All timestamps are `TIMESTAMPTZ`, which is excellent for handling timezones.

*   `tournaments`:
    *   Stores core tournament details, including `name`, `format`, `status`.
    *   Contains progression fields: `progression_format`, `current_stage`, `current_round`, `auto_advance`, `progression_locked`.
    *   Supports home/away logic via `home_away_enabled` (boolean) and `home_away_stages` (`varchar[]`), which stores an array of stage keys where home/away is active.
*   `tournament_teams`:
    *   Stores teams participating in a tournament.
*   `tournament_matches`:
    *   The core table for all matches.
    *   `starts_at` (`TIMESTAMPTZ`): The scheduled start time of a match. **Crucially, this column is not indexed.**
    *   `status` (`match_status` ENUM): `'pending'`, `'live'`, or `'finished'`.
    *   `result_confirmed` (`boolean`): A flag indicating the match result is final. This is the trigger for progression logic.
    *   `leg_number` (`int`): Differentiates between legs of a match (e.g., 1 for home, 2 for away).
    *   `stage_number` (`int`), `round_number` (`int`): Defines where the match sits within the tournament structure.
*   `tournament_standings`:
    *   A denormalized table for calculating and storing league/group standings.

### ⚠️ RISKS & EDGE CASES

*   **Missing Index**: The most significant performance risk is the lack of an index on `tournament_matches.starts_at`. Queries filtering matches by date (Feature 1) will trigger a full table scan, which will become progressively slower as more matches are added across all tournaments.
*   **Race Conditions**:
    *   The `generateNextRound` function uses `SELECT ... FOR UPDATE` on the `tournaments` table, which is a good defense against concurrent attempts to advance the same tournament.
    *   However, the `PATCH .../matches/:matchId` endpoint does not have sufficient guards. A race condition could occur where two admins attempt to submit the final score for the same match simultaneously. While the last write would win, it could lead to confusion. More importantly, there's no lock preventing edits to an already confirmed match.
*   **Missing Constraints**: There is no database-level constraint to prevent a match with `result_confirmed = true` from being modified. The application relies solely on client-side behavior and API endpoint logic, which is incomplete. This is a critical data integrity risk (addressed in Feature 3).
*   **Implicit Logic**: A lot of the tournament structure logic (e.g., what constitutes a "round" in a round-robin tournament) is handled implicitly in the application code (`buildMatches` function) rather than being defined structurally in the database. This makes some features, like selecting specific rounds (Feature 2), more complex to implement.

---

### 🛠 IMPLEMENTATION PLAN (NO CODE)

#### 1️⃣ Match Control — Show Only Today’s Matches

*   **What must change**: The backend API endpoint that serves match data for the control panel needs to be modified to accept a date filter. If no dedicated endpoint exists, the generic `GET /:id/details` endpoint will need to be augmented or a new endpoint created.
*   **Where**:
    1.  **Backend**: In `backend/src/modules/tournaments/tournaments.routes.js`, modify the `GET /:id/details` handler (or create a new `GET /:id/matches/today` endpoint). The SQL query for `tournament_matches` must be changed to include a `WHERE` clause on the `starts_at` column. The query must correctly handle timezones by casting the current date to a UTC timestamp range (e.g., `WHERE starts_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC') AND starts_at < DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day'`).
    2.  **Frontend**: The data-fetching logic in the "Match Control" component/page (`src/pages/Control.jsx` or similar) must be updated to call the modified/new endpoint.
*   **Migration Needed**: **Yes.** A non-blocking migration is required to add an index to the `starts_at` column.
    *   `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tournament_matches_starts_at ON tournament_matches(starts_at);`
*   **Risk Level**: **Low** (with index). Without the index, the risk is **Medium** due to performance degradation over time.
*   **Estimated Complexity**: Low.

#### 2️⃣ Admin Multi-Selection of Rounds

*   **What must change**: The system needs a way to store which rounds of a round-robin tournament are "active" or "selected". We can reuse the existing pattern for `home_away_stages`. A new column on the `tournaments` table will store an array of selected round numbers. The match generation logic will need to respect this selection.
*   **Where**:
    1.  **DB Schema**: Add a new column `selected_rounds INTEGER[]` to the `tournaments` table.
    2.  **Backend API**: In `tournaments.routes.js`, update `createTournamentSchema` and `updateTournamentSchema` to accept a `selected_rounds` array of numbers.
    3.  **Backend Logic**: In `tournaments.routes.js`, the `buildMatches` function needs to be updated. When the format is round-robin, it should check if `selected_rounds` is populated. If it is, it should only generate `tournament_matches` records for the rounds included in that array. If the array is empty or null, it should generate all rounds as it does currently.
    4.  **Frontend**: The UI in `TournamentWizardPage.jsx` (or equivalent admin panel) needs a multi-select component (e.g., checkboxes) to allow the admin to pick the rounds.
*   **Migration Needed**: **Yes.** A simple `ALTER TABLE` is needed to add the new `selected_rounds` column.
*   **Risk Level**: **Low**. The change is contained and follows an existing pattern.
*   **Estimated Complexity**: Medium.

#### 3️⃣ Lock Ended Matches (Critical Integrity Control)

*   **What must change**: A strict validation check must be added to the backend to prevent any modification to a match that is already considered final.
*   **Where**:
    1.  **Backend**: In `backend/src/modules/tournaments/tournaments.routes.js`, at the beginning of the `PATCH /:id/matches/:matchId` handler. Before processing any updates, the code must query the existing match state from the database.
    2.  **Validation Logic**: It should check if `previousMatch.result_confirmed` is `true`. If it is, the handler must immediately throw a `409 Conflict` (or `403 Forbidden`) error with a message like "Match is locked and cannot be edited." This prevents any `UPDATE` query from running.
    3.  **Progression Monitor**: The `Progression Monitor` already correctly uses `result_confirmed`, so no changes are needed there. It will simply see a match as "confirmed" and use it for its calculations.
*   **Migration Needed**: **No.** The required columns (`result_confirmed`) already exist. A database-level CHECK constraint or trigger could be added for defense-in-depth, but a strong application-level check is the immediate priority.
*   **Risk Level**: **Low**. This is a critical integrity fix and is simple to implement.
*   **Estimated Complexity**: Low.

#### 4️⃣ Two-Leg Round Robin (Home & Away Aggregate System)

*   **What must change**: The system needs a way to link the two legs of a single "tie" and a mechanism to calculate aggregate scores for these ties *within a round-robin stage*.
*   **Where**:
    1.  **DB Schema**: Add a `tie_id UUID` column to the `tournament_matches` table. When generating a pair of home/away matches, both records will share the same `tie_id`. A `UUID` is preferable to an integer to avoid sequence collisions during generation. Default can be `NULL`.
    2.  **Backend Logic (`buildMatches`)**: In `tournaments.routes.js`, when `buildMatches` generates a home-and-away pair, it must first generate a new `UUID` and assign it to the `tie_id` field of both match records.
    3.  **New Service Logic**: Create a new function, perhaps in `progression.service.js`, called `calculateRoundRobinTie(client, tieId)`. This function would select both matches with the given `tie_id`, calculate the aggregate score, and determine a winner. This logic can be adapted from the existing `extractWinnersFromKnockoutRound`.
    4.  **Backend Endpoint**: This logic needs to be triggered somewhere. After a match result is confirmed (`PATCH .../matches/:matchId`), the system could check if its `tie_id` is non-null. If so, it checks if the *other* match in the tie is also confirmed. If both are confirmed, it triggers the aggregate calculation and locks both matches, possibly updating a separate standings table or a "tie result" table.
*   **Migration Needed**: **Yes.** An `ALTER TABLE` is needed to add the `tie_id` column and an index on it.
*   **Risk Level**: **High**. This feature introduces new concepts not native to the current round-robin logic. It requires careful handling of state (e.g., what happens if only one leg is confirmed?), transaction management to update both matches and potentially standings atomically, and could have unforeseen interactions with the existing progression engine.
*   **Estimated Complexity**: High.

---

### 🔐 DATA SAFETY PLAN

*   **Transactions**: All feature implementations that involve multiple database writes MUST be wrapped in the existing `withTransaction` utility. This applies specifically to Feature 4 (updating two matches and standings at once) and Feature 2 (regenerating matches based on new round selections).
*   **Pessimistic Locking**: For operations that depend on a "read-then-write" pattern on the same record (like Feature 3), the initial read should use `SELECT ... FOR UPDATE` to lock the row and prevent race conditions, although a simple pre-check and error is sufficient for the lock feature.
*   **Database Constraints**:
    *   An index on `tournament_matches(starts_at)` is required for performance and data safety under load.
    *   An index should be added to `tournament_matches(tie_id)` if Feature 4 is implemented.
*   **Validation**: All changes must continue to use `zod` for strict input validation. The logic for Feature 3 is a new, critical server-side validation.

### 🚦 FINAL RECOMMENDATION

*   **Can this be implemented without structural refactor?**
    *   Yes. Features 1, 2, and 3 can be implemented cleanly on top of the existing architecture without a major refactor. Feature 4 is more complex and borders on requiring a new "ties" abstraction, but it can likely be implemented carefully within the current structure as proposed.
*   **Does any feature require DB change?**
    *   **Yes.** Features 1, 2, and 4 all require database migrations (adding columns or indexes). Feature 3 does not.
*   **Is downtime required?**
    *   **No.** All proposed migrations (adding columns with defaults, creating indexes concurrently) can be performed without requiring application downtime.
*   **Order of Execution**: I recommend the following order of implementation:
    1.  **Feature 3 (Lock Ended Matches)**: Highest priority. This is a critical data integrity fix with low complexity.
    2.  **Feature 1 (Today’s Matches)**: High-value user feature with low complexity, but requires the index migration to be done first.
    3.  **Feature 2 (Admin Multi-Selection of Rounds)**: Medium complexity, self-contained feature.
    4.  **Feature 4 (Two-Leg Round Robin)**: Lowest priority due to its high complexity and risk. It should be tackled last and with extensive testing.

This plan is ready for approval.
