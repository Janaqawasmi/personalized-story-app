# Firestore Reference Data Collection Structure

## Collection Path
`referenceData/{subcollection}/{documentId}`

## Subcollections

### 1. topics
**Path:** `referenceData/topics/{topicKey}`

**Example Document:**
```json
{
  "label_en": "Fear & Anxiety",
  "label_ar": "الخوف والقلق",
  "label_he": "פחד וחרדה",
  "active": true
}
```

**Example Document IDs:**
- `fear_anxiety`
- `social_interaction`
- `emotional_regulation`

---

### 2. situations
**Path:** `referenceData/situations/{situationKey}`

**Example Document:**
```json
{
  "topicKey": "fear_anxiety",
  "label_en": "Fear of School",
  "label_ar": "خوف من المدرسة",
  "label_he": "פחד מבית ספר",
  "active": true
}
```

**Example Document IDs:**
- `fear_of_school`
- `fear_of_dark`
- `separation_anxiety`

**Note:** Each situation document must include `topicKey` to link it to a topic.

---

### 3. emotionalGoals
**Path:** `referenceData/emotionalGoals/{goalKey}`

**Example Document:**
```json
{
  "label_en": "Normalize Emotions",
  "label_ar": "تطبيع المشاعر",
  "label_he": "נרמול רגשות",
  "active": true
}
```

**Example Document IDs:**
- `normalize_emotions`
- `reduce_fear`
- `build_trust`
- `self_confidence`
- `emotional_regulation`

---

### 4. exclusions
**Path:** `referenceData/exclusions/{exclusionKey}`

**Example Document:**
```json
{
  "label_en": "Medical Imagery",
  "label_ar": "الصور الطبية",
  "label_he": "דימויים רפואיים",
  "active": true
}
```

**Example Document IDs:**
- `medical_imagery`
- `violence_reference`
- `religious_content`

---

## Document Schema

All documents in reference data subcollections follow this structure:

### Required Fields
- `label_en`: string - English label
- `label_ar`: string - Arabic label  
- `label_he`: string - Hebrew label
- `active`: boolean - Whether this item is active/available

### Optional Fields (situations only)
- `topicKey`: string - Reference to parent topic (required for situations)

### Document ID
- Document ID must be the enum key (e.g., `fear_anxiety`, `normalize_emotions`)
- Should be lowercase with underscores
- Must be unique within each subcollection

---

## Firestore Structure Visualization

```
referenceData/
├── topics/
│   ├── fear_anxiety/
│   │   ├── label_en: "Fear & Anxiety"
│   │   ├── label_ar: "الخوف والقلق"
│   │   ├── label_he: "פחד וחרדה"
│   │   └── active: true
│   └── social_interaction/
│       └── ...
│
├── situations/
│   ├── fear_of_school/
│   │   ├── topicKey: "fear_anxiety"
│   │   ├── label_en: "Fear of School"
│   │   ├── label_ar: "خوف من المدرسة"
│   │   ├── label_he: "פחד מבית ספר"
│   │   └── active: true
│   └── fear_of_dark/
│       └── ...
│
├── emotionalGoals/
│   ├── normalize_emotions/
│   │   ├── label_en: "Normalize Emotions"
│   │   ├── label_ar: "تطبيع المشاعر"
│   │   ├── label_he: "נרמול רגשות"
│   │   └── active: true
│   └── reduce_fear/
│       └── ...
│
└── exclusions/
    ├── medical_imagery/
    │   ├── label_en: "Medical Imagery"
    │   ├── label_ar: "الصور الطبية"
    │   ├── label_he: "דימויים רפואיים"
    │   └── active: true
    └── violence_reference/
        └── ...
```

---

## Usage Notes

1. **Querying Active Items Only:**
   ```javascript
   db.collection('referenceData/topics')
     .where('active', '==', true)
     .get();
   ```

2. **Querying Situations by Topic:**
   ```javascript
   db.collection('referenceData/situations')
     .where('topicKey', '==', 'fear_anxiety')
     .where('active', '==', true)
     .get();
   ```

3. **Getting Label by Language:**
   ```javascript
   const doc = await db.collection('referenceData/topics')
     .doc('fear_anxiety')
     .get();
   const label = doc.data()[`label_${language}`]; // language: 'en', 'ar', or 'he'
   ```

---

## Security

- **Read:** Authenticated users can read all reference data
- **Write:** Only admin users can create, update, or delete reference data
- **Purpose:** Reference data should be immutable for clients to maintain data integrity

