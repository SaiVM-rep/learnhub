from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from courses.models import Category, Course, Module, Lesson

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed database with sample data'

    def handle(self, *args, **options):
        # Create users
        admin, _ = User.objects.get_or_create(
            email='admin@learnhub.com',
            defaults={
                'username': 'admin',
                'first_name': 'System',
                'last_name': 'Admin',
                'role': 'ADMIN',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        admin.set_password('admin123')
        admin.save()

        instructor1, _ = User.objects.get_or_create(
            email='john.smith@learnhub.com',
            defaults={
                'username': 'johnsmith',
                'first_name': 'John',
                'last_name': 'Smith',
                'role': 'INSTRUCTOR',
            }
        )
        instructor1.set_password('instructor123')
        instructor1.save()

        instructor2, _ = User.objects.get_or_create(
            email='sarah.jones@learnhub.com',
            defaults={
                'username': 'sarahjones',
                'first_name': 'Sarah',
                'last_name': 'Jones',
                'role': 'INSTRUCTOR',
            }
        )
        instructor2.set_password('instructor123')
        instructor2.save()

        student, _ = User.objects.get_or_create(
            email='student@learnhub.com',
            defaults={
                'username': 'student',
                'first_name': 'Test',
                'last_name': 'Student',
                'role': 'STUDENT',
            }
        )
        student.set_password('student123')
        student.save()

        # Create categories
        categories_data = [
            {'name': 'Web Development', 'slug': 'web-development', 'icon': 'code'},
            {'name': 'Data Science', 'slug': 'data-science', 'icon': 'bar-chart'},
            {'name': 'Machine Learning', 'slug': 'machine-learning', 'icon': 'cpu'},
            {'name': 'Mobile Development', 'slug': 'mobile-development', 'icon': 'smartphone'},
            {'name': 'Cloud Computing', 'slug': 'cloud-computing', 'icon': 'cloud'},
            {'name': 'Cybersecurity', 'slug': 'cybersecurity', 'icon': 'shield'},
        ]
        categories = {}
        for cat_data in categories_data:
            cat, _ = Category.objects.get_or_create(slug=cat_data['slug'], defaults=cat_data)
            categories[cat_data['slug']] = cat

        # Create courses
        courses_data = [
            {
                'title': 'Full-Stack Web Development with React & Django',
                'slug': 'fullstack-react-django',
                'description': 'Master modern web development by building real-world applications with React for the frontend and Django for the backend. This comprehensive course covers everything from setting up your development environment to deploying production-ready applications.',
                'short_description': 'Build production-ready web apps with React and Django from scratch.',
                'instructor': instructor1,
                'category': categories['web-development'],
                'price': 2999.00,
                'duration_hours': 48,
                'difficulty': 'INTERMEDIATE',
                'is_featured': True,
            },
            {
                'title': 'Python for Data Science & Analytics',
                'slug': 'python-data-science',
                'description': 'Learn Python programming for data analysis, visualization, and machine learning. This course covers NumPy, Pandas, Matplotlib, Seaborn, and scikit-learn with hands-on projects using real datasets.',
                'short_description': 'Master data analysis with Python, Pandas, and visualization libraries.',
                'instructor': instructor2,
                'category': categories['data-science'],
                'price': 1999.00,
                'duration_hours': 36,
                'difficulty': 'BEGINNER',
                'is_featured': True,
            },
            {
                'title': 'Deep Learning & Neural Networks Masterclass',
                'slug': 'deep-learning-masterclass',
                'description': 'Dive deep into neural networks, CNNs, RNNs, transformers, and GANs. Build cutting-edge AI applications using TensorFlow and PyTorch with industry-standard practices.',
                'short_description': 'Build AI applications with TensorFlow and PyTorch.',
                'instructor': instructor1,
                'category': categories['machine-learning'],
                'price': 3999.00,
                'duration_hours': 60,
                'difficulty': 'ADVANCED',
                'is_featured': True,
            },
            {
                'title': 'React Native Mobile App Development',
                'slug': 'react-native-mobile',
                'description': 'Build cross-platform mobile applications for iOS and Android using React Native. Learn navigation, state management, API integration, and publishing to app stores.',
                'short_description': 'Create cross-platform mobile apps with React Native.',
                'instructor': instructor2,
                'category': categories['mobile-development'],
                'price': 2499.00,
                'duration_hours': 40,
                'difficulty': 'INTERMEDIATE',
            },
            {
                'title': 'AWS Cloud Architecture & DevOps',
                'slug': 'aws-cloud-devops',
                'description': 'Master cloud computing with AWS services including EC2, S3, Lambda, RDS, and more. Learn CI/CD pipelines, infrastructure as code with Terraform, and container orchestration with Kubernetes.',
                'short_description': 'Design and deploy scalable cloud solutions on AWS.',
                'instructor': instructor2,
                'category': categories['cloud-computing'],
                'price': 3499.00,
                'duration_hours': 52,
                'difficulty': 'ADVANCED',
            },
            {
                'title': 'Ethical Hacking & Cybersecurity Fundamentals',
                'slug': 'ethical-hacking-cybersecurity',
                'description': 'Learn penetration testing, vulnerability assessment, network security, and defensive security practices. This course prepares you for industry certifications like CEH and CompTIA Security+.',
                'short_description': 'Master penetration testing and security fundamentals.',
                'instructor': instructor2,
                'category': categories['cybersecurity'],
                'price': 2799.00,
                'duration_hours': 44,
                'difficulty': 'INTERMEDIATE',
            },
        ]

        for course_data in courses_data:
            course_data['is_published'] = True
            course, created = Course.objects.get_or_create(
                slug=course_data['slug'], defaults=course_data
            )
            if created:
                # Add modules and lessons
                for i in range(1, 5):
                    module = Module.objects.create(
                        course=course,
                        title=f'Module {i}: {"Fundamentals" if i == 1 else "Intermediate" if i == 2 else "Advanced" if i == 3 else "Project"}',
                        description=f'Module {i} description for {course.title}',
                        order=i,
                    )
                    for j in range(1, 4):
                        Lesson.objects.create(
                            module=module,
                            title=f'Lesson {j}: Topic {i}.{j}',
                            lesson_type='VIDEO' if j != 3 else 'TEXT',
                            duration_minutes=15 + (i * 5) + (j * 3),
                            order=j,
                            is_preview=(i == 1 and j == 1),
                        )

        self.stdout.write(self.style.SUCCESS('Seed data created successfully!'))
