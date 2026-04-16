from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from core.models import User
from .models import Category, Course, Module, Lesson, Enrollment, Review, LessonProgress


class CategoryModelTest(TestCase):
    def setUp(self):
        self.category = Category.objects.create(
            name='Programming', slug='programming', description='Learn to code'
        )

    def test_str(self):
        self.assertEqual(str(self.category), 'Programming')

    def test_slug_unique(self):
        with self.assertRaises(Exception):
            Category.objects.create(name='Programming 2', slug='programming')


class CourseModelTest(TestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            username='instructor1', email='inst@test.com',
            password='testpass123', first_name='John', last_name='Doe',
            role='INSTRUCTOR'
        )
        self.category = Category.objects.create(name='Web Dev', slug='web-dev')
        self.course = Course.objects.create(
            title='Django Basics', slug='django-basics',
            description='Learn Django', instructor=self.instructor,
            category=self.category, price=29.99, is_published=True
        )

    def test_str(self):
        self.assertEqual(str(self.course), 'Django Basics')

    def test_enrollment_count_zero(self):
        self.assertEqual(self.course.enrollment_count, 0)

    def test_average_rating_no_reviews(self):
        self.assertEqual(self.course.average_rating, 0)

    def test_average_rating_with_reviews(self):
        student = User.objects.create_user(
            username='student1', email='s1@test.com', password='testpass123',
            role='STUDENT'
        )
        Review.objects.create(course=self.course, student=student, rating=4)
        self.assertEqual(self.course.average_rating, 4.0)

    def test_total_lessons(self):
        module = Module.objects.create(course=self.course, title='Module 1', order=0)
        Lesson.objects.create(module=module, title='Lesson 1', order=0, duration_minutes=10)
        Lesson.objects.create(module=module, title='Lesson 2', order=1, duration_minutes=15)
        self.assertEqual(self.course.total_lessons, 2)

    def test_total_duration_minutes(self):
        module = Module.objects.create(course=self.course, title='Module 1', order=0)
        Lesson.objects.create(module=module, title='L1', order=0, duration_minutes=10)
        Lesson.objects.create(module=module, title='L2', order=1, duration_minutes=20)
        self.assertEqual(self.course.total_duration_minutes, 30)

    def test_slug_unique(self):
        with self.assertRaises(Exception):
            Course.objects.create(
                title='Another', slug='django-basics',
                description='Dup', instructor=self.instructor
            )


class EnrollmentModelTest(TestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            username='inst', email='inst@test.com', password='pass123',
            role='INSTRUCTOR'
        )
        self.student = User.objects.create_user(
            username='stu', email='stu@test.com', password='pass123',
            role='STUDENT'
        )
        self.course = Course.objects.create(
            title='Test Course', slug='test-course',
            description='Desc', instructor=self.instructor, is_published=True
        )

    def test_enrollment_str(self):
        enrollment = Enrollment.objects.create(student=self.student, course=self.course)
        self.assertIn('stu@test.com', str(enrollment))
        self.assertIn('Test Course', str(enrollment))

    def test_unique_enrollment(self):
        Enrollment.objects.create(student=self.student, course=self.course)
        with self.assertRaises(Exception):
            Enrollment.objects.create(student=self.student, course=self.course)

    def test_enrollment_increases_count(self):
        Enrollment.objects.create(student=self.student, course=self.course)
        self.assertEqual(self.course.enrollment_count, 1)


class CategoryAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        Category.objects.create(name='Science', slug='science')
        Category.objects.create(name='Math', slug='math')

    def test_list_categories(self):
        response = self.client.get(reverse('category-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_categories_public_access(self):
        response = self.client.get(reverse('category-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class CourseListAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.instructor = User.objects.create_user(
            username='inst', email='inst@test.com', password='pass123',
            first_name='Jane', last_name='Smith', role='INSTRUCTOR'
        )
        self.category = Category.objects.create(name='Tech', slug='tech')
        self.course1 = Course.objects.create(
            title='Python 101', slug='python-101', description='Learn Python',
            instructor=self.instructor, category=self.category,
            is_published=True, is_active=True, difficulty='BEGINNER'
        )
        self.course2 = Course.objects.create(
            title='React Advanced', slug='react-advanced', description='Advanced React',
            instructor=self.instructor, category=self.category,
            is_published=True, is_active=True, difficulty='ADVANCED',
            is_featured=True
        )
        # Unpublished course — should not appear
        Course.objects.create(
            title='Draft Course', slug='draft-course', description='Draft',
            instructor=self.instructor, is_published=False, is_active=True
        )

    def test_list_published_only(self):
        response = self.client.get(reverse('course-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [c['slug'] for c in response.data['results']]
        self.assertIn('python-101', slugs)
        self.assertNotIn('draft-course', slugs)

    def test_filter_by_category(self):
        response = self.client.get(reverse('course-list'), {'category': 'tech'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_filter_by_difficulty(self):
        response = self.client.get(reverse('course-list'), {'difficulty': 'BEGINNER'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for c in response.data['results']:
            self.assertEqual(c['difficulty'], 'BEGINNER')

    def test_filter_featured(self):
        response = self.client.get(reverse('course-list'), {'featured': 'true'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for c in response.data['results']:
            self.assertTrue(c['is_featured'])

    def test_search(self):
        response = self.client.get(reverse('course-list'), {'search': 'Python'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(any('Python' in c['title'] for c in response.data['results']))

    def test_public_access(self):
        response = self.client.get(reverse('course-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class CourseDetailAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.instructor = User.objects.create_user(
            username='inst', email='inst@test.com', password='pass123',
            first_name='Jane', last_name='Smith', role='INSTRUCTOR'
        )
        self.course = Course.objects.create(
            title='Django Course', slug='django-course',
            description='Full Django', instructor=self.instructor,
            is_published=True, is_active=True
        )
        module = Module.objects.create(course=self.course, title='Intro', order=0)
        Lesson.objects.create(module=module, title='Welcome', order=0, duration_minutes=5)

    def test_detail_by_slug(self):
        response = self.client.get(reverse('course-detail', kwargs={'slug': 'django-course'}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Django Course')

    def test_detail_includes_modules(self):
        response = self.client.get(reverse('course-detail', kwargs={'slug': 'django-course'}))
        self.assertEqual(len(response.data['modules']), 1)
        self.assertEqual(len(response.data['modules'][0]['lessons']), 1)

    def test_detail_404_wrong_slug(self):
        response = self.client.get(reverse('course-detail', kwargs={'slug': 'nonexistent'}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_shows_not_enrolled(self):
        response = self.client.get(reverse('course-detail', kwargs={'slug': 'django-course'}))
        self.assertFalse(response.data['is_enrolled'])


class LessonCompleteAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.instructor = User.objects.create_user(
            username='inst', email='inst@test.com', password='pass123',
            role='INSTRUCTOR'
        )
        self.student = User.objects.create_user(
            username='stu', email='stu@test.com', password='pass123',
            role='STUDENT'
        )
        self.course = Course.objects.create(
            title='Test', slug='test', description='Desc',
            instructor=self.instructor, is_published=True
        )
        self.module = Module.objects.create(course=self.course, title='M1', order=0)
        self.lesson = Lesson.objects.create(
            module=self.module, title='L1', order=0, duration_minutes=10
        )

    def test_complete_requires_auth(self):
        url = reverse('lesson-complete', kwargs={'lesson_id': self.lesson.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_complete_requires_enrollment(self):
        self.client.force_authenticate(user=self.student)
        url = reverse('lesson-complete', kwargs={'lesson_id': self.lesson.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_complete_lesson_success(self):
        Enrollment.objects.create(student=self.student, course=self.course)
        self.client.force_authenticate(user=self.student)
        url = reverse('lesson-complete', kwargs={'lesson_id': self.lesson.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['completed'])
        self.assertEqual(response.data['progress'], 100.0)

    def test_complete_updates_progress(self):
        Enrollment.objects.create(student=self.student, course=self.course)
        Lesson.objects.create(module=self.module, title='L2', order=1, duration_minutes=5)
        self.client.force_authenticate(user=self.student)
        url = reverse('lesson-complete', kwargs={'lesson_id': self.lesson.id})
        response = self.client.post(url)
        self.assertEqual(response.data['progress'], 50.0)

    def test_complete_nonexistent_lesson(self):
        self.client.force_authenticate(user=self.student)
        import uuid
        url = reverse('lesson-complete', kwargs={'lesson_id': uuid.uuid4()})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class CourseProgressAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.instructor = User.objects.create_user(
            username='inst', email='inst@test.com', password='pass123',
            role='INSTRUCTOR'
        )
        self.student = User.objects.create_user(
            username='stu', email='stu@test.com', password='pass123',
            role='STUDENT'
        )
        self.course = Course.objects.create(
            title='Test', slug='test', description='Desc',
            instructor=self.instructor, is_published=True
        )
        module = Module.objects.create(course=self.course, title='M1', order=0)
        self.lesson = Lesson.objects.create(
            module=module, title='L1', order=0, duration_minutes=10
        )
        self.enrollment = Enrollment.objects.create(
            student=self.student, course=self.course
        )

    def test_progress_requires_auth(self):
        url = reverse('course-progress', kwargs={'course_id': self.course.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_progress_initial(self):
        self.client.force_authenticate(user=self.student)
        url = reverse('course-progress', kwargs={'course_id': self.course.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['completed_lessons'], 0)
        self.assertEqual(response.data['total_lessons'], 1)

    def test_progress_after_completion(self):
        LessonProgress.objects.create(
            student=self.student, lesson=self.lesson, is_completed=True
        )
        self.enrollment.progress = 100.0
        self.enrollment.save()
        self.client.force_authenticate(user=self.student)
        url = reverse('course-progress', kwargs={'course_id': self.course.id})
        response = self.client.get(url)
        self.assertEqual(response.data['completed_lessons'], 1)

    def test_progress_not_enrolled(self):
        other_student = User.objects.create_user(
            username='other', email='other@test.com', password='pass123',
            role='STUDENT'
        )
        self.client.force_authenticate(user=other_student)
        url = reverse('course-progress', kwargs={'course_id': self.course.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AdminCategoryAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin', email='admin@test.com', password='pass123',
            role='ADMIN'
        )
        self.student = User.objects.create_user(
            username='stu', email='stu@test.com', password='pass123',
            role='STUDENT'
        )
        self.category = Category.objects.create(name='Old', slug='old')

    def test_create_category_as_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse('category-create'), {
            'name': 'New Cat', 'slug': 'new-cat'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_category_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(reverse('category-create'), {
            'name': 'Nope', 'slug': 'nope'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_category(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            reverse('category-update', kwargs={'pk': self.category.id}),
            {'name': 'Updated'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_category(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(
            reverse('category-delete', kwargs={'pk': self.category.id})
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Category.objects.filter(id=self.category.id).exists())

    def test_delete_category_as_student_forbidden(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.delete(
            reverse('category-delete', kwargs={'pk': self.category.id})
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
