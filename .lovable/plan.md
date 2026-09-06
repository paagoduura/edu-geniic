
# Class/Section Management Implementation Plan

## Overview

This plan adds a comprehensive Class/Section Management system to the Teacher Dashboard, enabling teachers to create classes (e.g., "JSS 2A", "SS 1 Science"), assign students, and view class-level analytics. This addresses the Nigerian school context where students are organized into distinct classes/sections (also called "arms").

---

## Feature Summary

| Capability | Description |
|------------|-------------|
| **Create Classes** | Teachers create named classes with section identifiers (e.g., JSS 2A, SS 1B) |
| **Assign Students** | Add students to classes using their Student ID (STU-XXXXX) |
| **View Class Roster** | See all students in a class with their profiles |
| **Class Analytics** | View aggregated performance metrics for each class |
| **Assignment Targeting** | Create assignments for specific classes |
| **Bulk Operations** | Add/remove multiple students at once |

---

## Database Schema

### New Tables

```text
+---------------------------+
|      teacher_classes      |
+---------------------------+
| id (uuid, PK)             |
| teacher_id (uuid, FK)     | --> auth.users.id (teacher who owns the class)
| name (text)               | --> e.g., "JSS 2A" or "SS 1 Science"
| class_level (enum)        | --> Existing class_level enum (jss_1, ss_2, etc.)
| section (text)            | --> Optional section identifier (A, B, Science, Arts)
| subject (enum, nullable)  | --> Optional subject focus
| academic_year (text)      | --> e.g., "2025/2026"
| description (text)        | --> Optional notes about the class
| is_active (boolean)       | --> Soft delete flag
| created_at (timestamp)    |
| updated_at (timestamp)    |
+---------------------------+

+---------------------------+
|   teacher_class_students  |
+---------------------------+
| id (uuid, PK)             |
| class_id (uuid, FK)       | --> teacher_classes.id
| student_id (uuid, FK)     | --> profiles.user_id (the student)
| joined_at (timestamp)     |
| is_active (boolean)       | --> For soft removal
+---------------------------+
```

### RLS Policies

**teacher_classes:**
- Teachers can SELECT, INSERT, UPDATE their own classes
- Students can SELECT classes they belong to (via class_students join)
- Parents can SELECT classes their linked children belong to

**teacher_class_students:**
- Teachers can manage students in their classes
- Students can view their own class memberships
- Parents can view their children's class memberships

---

## Implementation Phases

### Phase 1: Database Setup

1. **Create migration** for `teacher_classes` table
2. **Create migration** for `teacher_class_students` table  
3. **Add RLS policies** with security definer functions
4. **Create indexes** for efficient querying

### Phase 2: Teacher Class Management UI

Create new components and pages:

**New Files:**
- `src/pages/TeacherClasses.tsx` - Main class management page
- `src/components/teacher/ClassCard.tsx` - Class display card
- `src/components/teacher/CreateClassDialog.tsx` - Create class form
- `src/components/teacher/ClassStudentsDialog.tsx` - Manage class roster
- `src/components/teacher/ClassAnalytics.tsx` - Class performance view

**Update Files:**
- `src/pages/TeacherDashboard.tsx` - Add Classes tab and navigation
- `src/App.tsx` - Add route for `/teacher/classes` and `/teacher/classes/:classId`

### Phase 3: Student Assignment Features

**New File:**
- `src/components/teacher/AddStudentsToClass.tsx` - Search and add students by Student ID

**Features:**
- Search students by name or Student ID (STU-XXXXX)
- Bulk import via comma-separated Student IDs
- Remove students from class
- View student's current performance in context

### Phase 4: Class Analytics Dashboard

**New File:**
- `src/pages/TeacherClassDetail.tsx` - Detailed class view with analytics

**Analytics Include:**
- Average class score across all subjects
- Subject-wise performance breakdown
- Individual student rankings within class
- Assignment completion rates
- Attendance tracking (future enhancement)
- Trend charts showing improvement over time

### Phase 5: Assignment Integration

**Update Files:**
- `src/pages/TeacherAssignments.tsx` - Add class selector when creating assignments

**New Column (optional):**
- Add `target_class_id` to `assignments` table for class-specific assignments

---

## UI/UX Design

### Teacher Dashboard Updates

Add a new "Classes" tab in the existing TabsList:

```text
+--------------------------------------------------+
| Students | Pending | Approved | Classes (NEW)    |
+--------------------------------------------------+
```

### Classes Tab Content

```text
+--------------------------------------------------+
| [+ Create Class]                    [Search...]  |
+--------------------------------------------------+
| +------------------+  +------------------+       |
| | JSS 2A           |  | SS 1 Science     |       |
| | Mathematics      |  | Physics          |       |
| | 32 students      |  | 28 students      |       |
| | Avg: 72%         |  | Avg: 68%         |       |
| | [View] [Manage]  |  | [View] [Manage]  |       |
| +------------------+  +------------------+       |
+--------------------------------------------------+
```

### Class Detail Page

```text
/teacher/classes/:classId

+--------------------------------------------------+
| <- Back                                          |
| JSS 2A - Mathematics           [Edit] [Archive]  |
| 2025/2026 Academic Year                          |
+--------------------------------------------------+
| Overview | Students | Performance | Assignments  |
+--------------------------------------------------+

[Overview Tab]
+------------------+  +------------------+
| Total Students   |  | Class Average    |
| 32               |  | 72%              |
+------------------+  +------------------+

[Students Tab]
+--------------------------------------------------+
| [+ Add Students]                   [Search...]   |
+--------------------------------------------------+
| Avatar | Name          | Student ID | Avg Score  |
|--------|---------------|------------|------------|
|   O    | John Ade      | STU-12345  | 85%        |
|   O    | Mary Obi      | STU-23456  | 78%        |
+--------------------------------------------------+

[Performance Tab]
- Subject breakdown charts
- Top/bottom performers
- Trend analysis

[Assignments Tab]
- Assignments given to this class
- Completion rates
- Grade distribution
```

---

## Technical Details

### Security Definer Function

```sql
-- Check if user is a teacher
CREATE OR REPLACE FUNCTION public.is_teacher(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'teacher'
  )
$$;

-- Check if teacher owns class
CREATE OR REPLACE FUNCTION public.owns_class(_user_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_classes
    WHERE id = _class_id AND teacher_id = _user_id
  )
$$;
```

### Data Flow

```text
Teacher Creates Class
        |
        v
teacher_classes table (RLS: teacher_id = auth.uid())
        |
        v
Add Students (by Student ID lookup)
        |
        v
teacher_class_students table
        |
        v
Query performance/quizzes filtered by class members
        |
        v
Display aggregated analytics
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `migration.sql` | CREATE | New tables and RLS policies |
| `src/pages/TeacherClasses.tsx` | CREATE | Main classes management page |
| `src/pages/TeacherClassDetail.tsx` | CREATE | Individual class detail page |
| `src/components/teacher/ClassCard.tsx` | CREATE | Reusable class card component |
| `src/components/teacher/CreateClassDialog.tsx` | CREATE | Dialog for creating new classes |
| `src/components/teacher/ClassStudentsManager.tsx` | CREATE | Add/remove students component |
| `src/components/teacher/ClassAnalyticsCard.tsx` | CREATE | Analytics display component |
| `src/pages/TeacherDashboard.tsx` | UPDATE | Add Classes tab and navigation |
| `src/pages/TeacherAssignments.tsx` | UPDATE | Add class selector for assignments |
| `src/App.tsx` | UPDATE | Add new routes |

---

## Estimated Implementation Order

1. **Database migration** (teacher_classes, teacher_class_students, RLS policies)
2. **TeacherDashboard.tsx** updates (add Classes tab)
3. **TeacherClasses.tsx** page (list and create classes)
4. **ClassCard.tsx** component
5. **CreateClassDialog.tsx** component
6. **TeacherClassDetail.tsx** page
7. **ClassStudentsManager.tsx** component (add/remove students)
8. **ClassAnalyticsCard.tsx** component
9. **App.tsx** routing updates
10. **TeacherAssignments.tsx** integration (optional class targeting)

---

## Success Criteria

- Teachers can create classes with name, level, and section
- Teachers can add students using Student ID (STU-XXXXX)
- Teachers see aggregated class performance metrics
- Class roster displays student details and individual scores
- Navigation between classes is smooth and intuitive
- RLS policies properly restrict access by role
