# kabSUBO — Technical Review (LOCAL ONLY)

This document contains your thesis defense answers and technical notes. 
**DO NOT COMMIT THIS FILE TO GITHUB.**

---

## 1. Requirement Compliance (ADBMS Phase Check)

### Phase 2: SQL Implementation & Integrity
*   **Data Types**: Uses `UUID` for IDs, `DECIMAL` for coordinates/prices, and `JSON` for flexible data like hours and tags.
*   **Advanced Logic**:
    *   **SQL Trigger**: `before_insert_places` automatically converts restaurant names into URL slugs.
    *   **Stored Procedure**: `submit_place_with_audit` handles multi-table inserts.
    *   **Transactions**: Uses `START TRANSACTION`, `COMMIT`, and `ROLLBACK` for consistency.

### Phase 3: System Integration (PHP)
*   **The Bridge**: `backend/db_config.php` uses **PDO** for secure connections.
*   **CRUD**: Full implementation across Places, Menus, Reviews, and Submissions.
*   **Optimization**: `place_summary_view` (SQL View) joins 4 tables for fast reporting.

### Phase 4: Security & Performance
*   **Auth**: Uses `password_hash()` and `password_verify()` (BCRYPT).
*   **Indexing**: B-Tree on IDs/Slugs and FULLTEXT on search columns.

---

## 2. Thesis Defense Q&A

**Q: Why a decoupled architecture (Next.js + PHP)?**
**A:** To combine a modern React-based user interface with the reliable database handling of PHP.

**Q: How does the Chatbot work?**
**A:** It uses **Retrieval-Augmented Generation (RAG)** to fetch real SQL data before generating answers.

**Q: Did you do Normalization?**
**A:** Yes, up to **3NF**. We separated Profiles/Roles (No Transitive Dependencies) and used a separate Menu table (No Repeating Groups).

---

## 3. Security Simple Explanation
*   **Prepared Statements**: Prevents SQL Injection.
*   **CORS**: Restricts API access to our website only.
*   **HttpOnly Cookies**: Protects user sessions from script theft.
