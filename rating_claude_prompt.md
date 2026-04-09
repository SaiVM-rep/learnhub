# Prompt for Claude — Course Rating & Review System

Copy everything below the line and paste it into Claude.

---

```
IMPORTANT: Before doing ANYTHING, read the file `CLAUDE.md` in the project root. It contains the full project structure, API endpoints, models, and conventions. Use it as your primary reference throughout this task. Do NOT ask me to repeat information that is already in CLAUDE.md.

## TASK: Implement Course Rating & Review System

Build a complete course rating feature where enrolled students can rate and review courses. All ratings must be saved in the backend, displayed on the course page (with total raters), and shown in the instructor dashboard.

---

## WHAT ALREADY EXISTS (DO NOT RECREATE):

### Review Model (`backend/courses/models.py` — lines 142-152):
```python
class Review(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='reviews')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reviews'
        unique_together = ['course', 'student']  # One review per student per course
```

### ReviewSerializer (`backend/courses/serializers.py` — lines 93-102):
```python
class ReviewSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'course', 'rating', 'comment', 'student_name', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_student_name(self, obj):
        return obj.student.get_full_name()
```

### Course model already has these properties:
```python
@property
def average_rating(self):
    avg = self.reviews.aggregate(models.Avg('rating'))['rating__avg']
    return round(avg, 1) if avg else 0
```

### CourseDetailSerializer already includes:
- `average_rating` (ReadOnlyField)
- `review_count` (SerializerMethodField that returns `obj.reviews.count()`)

### Frontend already displays (but ONLY as static text):
- CourseDetailPage line 183: `{course.average_rating || '4.5'} ({course.review_count || 0} reviews)`
- InstructorDashboardPage line 87: `{ label: 'Avg Rating', value: stats?.average_rating || '0.0' }`

### What does NOT exist yet:
- ❌ No API endpoints for creating/listing reviews
- ❌ No frontend API methods for reviews
- ❌ No rating UI (stars, form, review list) on CourseDetailPage
- ❌ Instructor dashboard doesn't show per-course ratings
- ❌ No way for a student to submit or see reviews

---

## STEP 1: Backend — Create Review API Endpoints

### File: `backend/courses/views.py` — Add two new views:

**1. `ReviewCreateView(APIView)` — POST endpoint for students to submit a review:**
- Permission: IsAuthenticated
- URL: Will be at `/api/courses/<uuid:course_id>/reviews/`
- Logic:
  - Validate that the user is enrolled in the course (check `Enrollment` model)
  - Validate rating is 1-5
  - Check if user already reviewed (unique_together constraint)
  - If already reviewed, UPDATE the existing review instead of creating a new one
  - Set `student = request.user` (don't let the client control this)
  - Return the created/updated review with `ReviewSerializer`
- Error responses:
  - 403 if not enrolled: `{ "error": "You must be enrolled in this course to leave a review." }`
  - 400 if invalid rating: `{ "error": "Rating must be between 1 and 5." }`

**2. `ReviewListView(generics.ListAPIView)` — GET endpoint to list all reviews for a course:**
- Permission: AllowAny  
- URL: Will be at `/api/courses/<uuid:course_id>/reviews/`
- Serializer: ReviewSerializer
- QuerySet: `Review.objects.filter(course_id=course_id).order_by('-created_at')`
- Pagination: None (return all reviews)
- Also return aggregate data: add a `list` method override that returns:
```json
{
  "average_rating": 4.5,
  "total_reviews": 12,
  "rating_distribution": { "5": 6, "4": 3, "3": 2, "2": 1, "1": 0 },
  "reviews": [...]
}
```

### File: `backend/courses/urls.py` — Register the endpoints:

Add these BEFORE the slug-based catch-all route (`path('<slug:slug>/', ...)`):
```python
path('<uuid:course_id>/reviews/', views.ReviewListView.as_view(), name='course-reviews'),
path('<uuid:course_id>/reviews/create/', views.ReviewCreateView.as_view(), name='course-review-create'),
```

IMPORTANT: These must come BEFORE `path('<slug:slug>/', ...)` in the urlpatterns list, otherwise Django will try to match the UUID as a slug.

---

## STEP 2: Backend — Add per-course rating to Instructor Dashboard

### File: `backend/courses/instructor_serializers.py`

Update `InstructorCourseListSerializer` to include the `average_rating` field. It already exists as a model property, just add it to the `fields` list:
```python
class InstructorCourseListSerializer(serializers.ModelSerializer):
    # ... existing fields ...
    average_rating = serializers.ReadOnlyField()  # ADD THIS if not already there
    
    class Meta:
        model = Course
        fields = [
            # ... existing fields ..., 'average_rating',  # ADD to fields list
        ]
```

---

## STEP 3: Frontend — API Service

### File: `frontend/src/services/api.js`

Add a new `reviewAPI` export:
```js
// Review APIs
export const reviewAPI = {
  getReviews: (courseId) => api.get(`/courses/${courseId}/reviews/`),
  createReview: (courseId, data) => api.post(`/courses/${courseId}/reviews/create/`, data),
};
```

---

## STEP 4: Frontend — Course Detail Page (Rating UI)

### File: `frontend/src/pages/CourseDetailPage.js`

This is the main UI work. Add a "Ratings & Reviews" section AFTER the quizzes section and BEFORE the `<LearningChatbot>`.

**New imports needed:**
- Add `reviewAPI` to the import from `../services/api`

**New state variables:**
```js
const [reviews, setReviews] = useState([]);
const [reviewStats, setReviewStats] = useState({ average_rating: 0, total_reviews: 0, rating_distribution: {} });
const [userRating, setUserRating] = useState(0);
const [userComment, setUserComment] = useState('');
const [hoverRating, setHoverRating] = useState(0);
const [submittingReview, setSubmittingReview] = useState(false);
const [reviewMsg, setReviewMsg] = useState(null);
const [hasReviewed, setHasReviewed] = useState(false);
```

**Fetch reviews** — add to the existing `useEffect` after `fetchCourse`, or as a separate fetch:
```js
// After course is loaded and we have course.id:
const fetchReviews = async () => {
  try {
    const res = await reviewAPI.getReviews(course.id);
    setReviews(res.data.reviews || []);
    setReviewStats({
      average_rating: res.data.average_rating || 0,
      total_reviews: res.data.total_reviews || 0,
      rating_distribution: res.data.rating_distribution || {},
    });
    // Check if current user already reviewed
    if (user) {
      const existingReview = (res.data.reviews || []).find(r => r.student_name === `${user.first_name} ${user.last_name}`);
      if (existingReview) {
        setUserRating(existingReview.rating);
        setUserComment(existingReview.comment || '');
        setHasReviewed(true);
      }
    }
  } catch {}
};
```

**Submit review handler:**
```js
const handleSubmitReview = async () => {
  if (userRating === 0) {
    setReviewMsg({ type: 'error', text: 'Please select a rating.' });
    return;
  }
  setSubmittingReview(true);
  setReviewMsg(null);
  try {
    await reviewAPI.createReview(course.id, { rating: userRating, comment: userComment });
    setReviewMsg({ type: 'success', text: hasReviewed ? 'Review updated!' : 'Review submitted! Thank you.' });
    setHasReviewed(true);
    fetchReviews(); // Refresh reviews list
    setTimeout(() => setReviewMsg(null), 3000);
  } catch (err) {
    setReviewMsg({ type: 'error', text: err.response?.data?.error || 'Failed to submit review.' });
  }
  setSubmittingReview(false);
};
```

**UI Section — "Ratings & Reviews":**

Place this after the Quizzes section (`</div>` at line ~427) and before `<LearningChatbot>`:

The section should include:

1. **Rating Summary** (always visible):
   - Large average rating number (e.g., "4.5")
   - 5 filled/empty stars next to it
   - "X reviews" text
   - Rating distribution bars (5-star → 1-star with percentage bars)

2. **Submit/Edit Review Form** (only for enrolled students):
   - 5 interactive star icons (click to select rating, hover to preview)
   - Textarea for optional comment
   - "Submit Review" or "Update Review" button
   - Success/error message

3. **Review List** (always visible):
   - Each review shows: student name (first letter avatar), star rating, comment, date
   - If no reviews: "No reviews yet. Be the first to rate this course!"

**Star component behavior:**
- Use the existing `Star` icon from lucide-react
- `fill="#f59e0b"` for selected/hovered stars, `fill="none"` for unselected
- `color="#f59e0b"` for all stars
- Size: 24px for the rating form, 14px for individual reviews
- `cursor: pointer` and `onMouseEnter`/`onMouseLeave` for hover effect
- `onClick` to set rating

**Styling:**
- Use existing CSS classes: `course-detail-section`, `btn btn-primary`, `form-input`
- Rating distribution bars: thin horizontal bars with `background: var(--primary)` fill
- Review cards: `background: var(--gray-50)`, `border-radius: 12px`, `padding: 16px`
- First-letter avatars: same style as instructor avatar (circle with gradient background)

---

## STEP 5: Instructor Dashboard — Show per-course ratings

### File: `frontend/src/pages/InstructorDashboardPage.js`

Update the courses table to show a **Rating** column:

1. Add 'Rating' to the table headers array (after 'Revenue', before 'Status'):
```js
['Course', 'Category', 'Students', 'Revenue', 'Rating', 'Status', 'Actions']
```

2. Add a `<td>` for rating in each course row (after the revenue cell):
```jsx
<td style={{ fontWeight: 600, color: 'var(--gray-700)' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    <Star size={14} color="#f59e0b" fill="#f59e0b" />
    {course.average_rating || '—'}
  </div>
</td>
```

---

## STEP 6: Update CLAUDE.md

After implementing everything, update the `CLAUDE.md` file:

1. In the **API Endpoints** section, add under Courses:
   | GET | `/<uuid>/reviews/` | AllowAny | List reviews + stats |
   | POST | `/<uuid>/reviews/create/` | Auth+Enrolled | Create/update review |

2. In the **Key Models** section, add:
   ### Review
   `id(UUID), course(FK), student(FK), rating(1-5), comment, created_at` (unique: course+student)

3. In the **Changelog**, add a new session entry:
   ### Session N - Course Rating & Reviews
   1. **Review API** - Added GET/POST endpoints for course reviews with rating distribution
   2. **CourseDetailPage** - Added star rating form for enrolled students + review list + rating summary
   3. **InstructorDashboard** - Added per-course average rating column to courses table
   4. **Instructor serializer** - Added average_rating to course list fields

---

## TESTING:

1. Log in as **student@learnhub.com / student123**
2. Navigate to a course the student is enrolled in
3. Scroll down to "Ratings & Reviews" section
4. Click stars to select a rating (1-5), optionally add a comment
5. Click "Submit Review" — verify success message
6. Refresh page — verify the review appears in the list and rating stats update
7. Try submitting again — should UPDATE the existing review, not create duplicate
8. Log in as **sarah.jones@learnhub.com / instructor123**
9. Go to instructor dashboard — verify the Rating column shows in the courses table
10. Try rating a course you're NOT enrolled in — should see no rating form (only enrolled students)

## IMPORTANT NOTES:
- Read `CLAUDE.md` FIRST before starting any work
- The Review model and ReviewSerializer ALREADY EXIST — do NOT recreate them
- The `unique_together = ['course', 'student']` constraint means one review per student per course — handle this by updating the existing review if one exists
- New URL patterns MUST be placed BEFORE the `<slug:slug>` catch-all in `courses/urls.py`
- The Django server is running at `python manage.py runserver` — restart if needed
- The React dev server is running via `npm start`
```
