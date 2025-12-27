# 🔍 Search Overlay - Firestore Query Analysis

## 📋 Summary

This document explains exactly how the search queries work in `SearchOverlay.tsx` and what fields are required for results to appear.

---

## 🔧 Filtering Fields (Always Applied)

Every query **MUST** satisfy these conditions:

### 1. Status Filter (Required)
```javascript
where("status", "==", "approved")
```
- **Field**: `status` (top-level)
- **Value**: Must be exactly `"approved"`
- **Impact**: Documents with `status !== "approved"` are **completely excluded**

### 2. Language Filter (Required - Two Attempts)

The code tries **two different locations** for language:

#### Attempt 1: Top-level `language` field
```javascript
where("language", "==", CURRENT_LANGUAGE)
```
- **Field**: `language` (top-level)
- **Value**: `CURRENT_LANGUAGE` (from `getCurrentLanguage()`)
- **Default**: `"he"` (Hebrew) if localStorage has no `"lang"` key
- **Also accepts**: `"ar"` (Arabic) if localStorage has `"lang": "ar"`

#### Attempt 2: Nested `generationConfig.language` field
```javascript
where("generationConfig.language", "==", CURRENT_LANGUAGE)
```
- **Field**: `generationConfig.language` (nested)
- **Value**: Same as above
- **Only used if**: Attempt 1 returns 0 documents

---

## 🔎 Search Matching Fields

The search matches against these fields in **priority order**:

### Priority 1: `specificSituation` (Exact Match)
- **When**: User types text that matches a situation label from `referenceData`
- **Query**: 
  ```javascript
  where("specificSituation", "==", situationId)
  ```
- **Example**: User types "אח חדש" → matches situation ID "new_sibling" → queries `specificSituation == "new_sibling"`

### Priority 2: `primaryTopic` (Exact Match)
- **When**: User types text that matches a topic label from `referenceData`
- **Query**:
  ```javascript
  where("primaryTopic", "==", topicId)
  ```
- **Example**: User types "שינויים במשפחה" → matches topic ID "family_changes" → queries `primaryTopic == "family_changes"`

### Priority 3: `title` (Partial Match - Client-side)
- **When**: No situation/topic match found
- **Query**: 
  ```javascript
  // First: Fetch all approved stories (with language filter)
  // Then: Filter client-side
  pool.filter((s) => (s.title || "").toLowerCase().includes(searchTerm))
  ```
- **Field**: `title` (top-level)
- **Matching**: Case-insensitive substring match

---

## 📝 Exact Firestore Queries

### Query 1: Initial Load (Suggested Searches + Popular Stories)
```javascript
// Attempt 1: Top-level language
query(
  collection(db, "story_templates"),
  where("status", "==", "approved"),
  where("language", "==", CURRENT_LANGUAGE),
  limit(100)
)

// Attempt 2: Nested language (if Attempt 1 is empty)
query(
  collection(db, "story_templates"),
  where("status", "==", "approved"),
  where("generationConfig.language", "==", CURRENT_LANGUAGE),
  limit(100)
)
```

### Query 2: Search by Situation
```javascript
// Attempt 1: Top-level language
query(
  collection(db, "story_templates"),
  where("status", "==", "approved"),
  where("language", "==", CURRENT_LANGUAGE),
  where("specificSituation", "==", situationId),
  limit(30)
)

// Attempt 2: Nested language (if Attempt 1 is empty)
query(
  collection(db, "story_templates"),
  where("status", "==", "approved"),
  where("generationConfig.language", "==", CURRENT_LANGUAGE),
  where("specificSituation", "==", situationId),
  limit(30)
)
```

### Query 3: Search by Topic
```javascript
// Attempt 1: Top-level language
query(
  collection(db, "story_templates"),
  where("status", "==", "approved"),
  where("language", "==", CURRENT_LANGUAGE),
  where("primaryTopic", "==", topicId),
  limit(30)
)

// Attempt 2: Nested language (if Attempt 1 is empty)
query(
  collection(db, "story_templates"),
  where("status", "==", "approved"),
  where("generationConfig.language", "==", CURRENT_LANGUAGE),
  where("primaryTopic", "==", topicId),
  limit(30)
)
```

### Query 4: Search by Title (Fallback)
```javascript
// First: Fetch all approved stories
query(
  collection(db, "story_templates"),
  where("status", "==", "approved"),
  where("language", "==", CURRENT_LANGUAGE), // or generationConfig.language
  limit(80)
)
// Then: Filter client-side by title
```

---

## ✅ Required Fields for Results to Appear

For a document in `story_templates` to appear in search results, it **MUST** have:

### Always Required:
1. ✅ `status` = `"approved"` (exact string match)
2. ✅ **Either**:
   - `language` = `CURRENT_LANGUAGE` (e.g., `"he"` or `"ar"`)
   - **OR** `generationConfig.language` = `CURRENT_LANGUAGE`

### Conditionally Required (Based on Search Type):

#### For Situation Search:
3. ✅ `specificSituation` = the situation ID being searched (e.g., `"new_sibling"`)

#### For Topic Search:
3. ✅ `primaryTopic` = the topic ID being searched (e.g., `"family_changes"`)

#### For Title Search:
3. ✅ `title` field exists and contains the search term (case-insensitive)

---

## 🚨 Common Issues That Filter Out All Results

### Issue 1: Wrong Language Value
- **Problem**: Documents have `language: "ar"` but `CURRENT_LANGUAGE` is `"he"` (or vice versa)
- **Solution**: Check `localStorage.getItem("lang")` or ensure documents match the expected language

### Issue 2: Language in Wrong Location
- **Problem**: Documents have `generationConfig.language` but code tries `language` first
- **Solution**: The code already handles this with fallback, but if BOTH are missing, no results

### Issue 3: Status Not "approved"
- **Problem**: Documents have `status: "draft"` or `status: "pending"` instead of `"approved"`
- **Solution**: Ensure all documents have `status: "approved"`

### Issue 4: Field Name Mismatch
- **Problem**: Documents use `situation` instead of `specificSituation`, or `topic` instead of `primaryTopic`
- **Solution**: Ensure field names match exactly:
  - `specificSituation` (not `situation`)
  - `primaryTopic` (not `topic`)

### Issue 5: ID Value Mismatch
- **Problem**: Documents have `specificSituation: "new-sibling"` but referenceData has ID `"new_sibling"` (hyphen vs underscore)
- **Solution**: Ensure IDs match exactly between Firestore and referenceData

---

## 🔍 Debugging Checklist

To verify why search returns no results:

1. ✅ Check `CURRENT_LANGUAGE` value:
   ```javascript
   console.log("Current language:", getCurrentLanguage());
   ```

2. ✅ Check document structure in Firestore:
   - Does `status` exist and equal `"approved"`?
   - Does `language` OR `generationConfig.language` exist and match `CURRENT_LANGUAGE`?
   - Does `specificSituation` / `primaryTopic` exist and match the search ID?

3. ✅ Check referenceData:
   - Is `referenceData` loaded?
   - Do situation/topic IDs in referenceData match Firestore values?

4. ✅ Test queries manually:
   ```javascript
   // In browser console or Firestore console
   // Try querying with exact field names and values
   ```

---

## 📊 Example Document Structure

A document that **WILL** appear in search results:

```json
{
  "status": "approved",
  "language": "ar",  // or generationConfig.language: "ar"
  "title": "قصة عن الأخ الجديد",
  "specificSituation": "new_sibling",
  "primaryTopic": "family_changes",
  "ageGroup": "O_3",
  "targetAgeGroup": "O_3"
}
```

A document that **WON'T** appear:

```json
{
  "status": "draft",  // ❌ Not "approved"
  "language": "he",   // ❌ Might not match CURRENT_LANGUAGE
  "title": "Story Title"
  // ❌ Missing specificSituation/primaryTopic for field searches
}
```

