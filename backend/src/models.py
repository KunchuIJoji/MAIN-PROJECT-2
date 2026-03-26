from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime

# Initialize the tools
db = SQLAlchemy()
bcrypt = Bcrypt()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='Student') 
    status = db.Column(db.String(20), default='pending') 
    
    # --- NEW: Added Profile Photo URL to the base User model for TPOs and Teachers ---
    profile_photo_url = db.Column(db.String(255), nullable=True)

    # Links to the specific profiles based on their role
    student_profile = db.relationship('StudentProfile', backref='user', uselist=False, cascade="all, delete-orphan")
    teacher_profile = db.relationship('TeacherProfile', backref='user', uselist=False, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)


class StudentProfile(db.Model):
    __tablename__ = 'student_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    full_name = db.Column(db.String(100))
    batch = db.Column(db.String(20))     
    branch = db.Column(db.String(50))    
    gender = db.Column(db.String(20), nullable=True)
    
    # --- Photo and Resume URLs ---
    profile_photo_url = db.Column(db.String(255), nullable=True)
    resume_url = db.Column(db.String(255), nullable=True)
    
    gpa = db.Column(db.Float, nullable=True) 
    sgpa_history = db.Column(db.JSON, nullable=True) 
    active_backlogs = db.Column(db.Integer, default=0)
    
    verification_status = db.Column(db.String(20), default='Pending')
    
    current_year = db.Column(db.Integer, default=1) 
    program_duration = db.Column(db.Integer, default=4) 
    roadmap_preference = db.Column(db.String(100), nullable=True) 
    
    certifications = db.relationship('Certification', backref='student', lazy=True, cascade="all, delete-orphan")
    applications = db.relationship('PlacementApplication', backref='student_profile', lazy=True, cascade="all, delete-orphan")
    milestones = db.relationship('RoadmapMilestone', backref='student_profile', lazy=True, cascade="all, delete-orphan")


class Certification(db.Model):
    __tablename__ = 'certifications'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student_profiles.id'), nullable=False)
    
    name = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(50), nullable=False) 
    specific_skill = db.Column(db.String(100), nullable=False) 
    is_verified = db.Column(db.Boolean, default=False)
    grade_point = db.Column(db.Integer, default=0)

    # ==========================================
    # NEW: Added for Auto-Grading functionality
    # ==========================================
    source = db.Column(db.String(50), nullable=False, default='Other')
    status = db.Column(db.String(20), default='Pending') 
    # ==========================================
    
    file_url = db.Column(db.String(255), nullable=True)


class TeacherProfile(db.Model):
    __tablename__ = 'teacher_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    assigned_batch = db.Column(db.String(20))  
    assigned_branch = db.Column(db.String(50))
    advisor_role = db.Column(db.String(20), nullable=True) 


class PlacementRequest(db.Model):
    __tablename__ = 'placement_requests'

    id = db.Column(db.Integer, primary_key=True)
    tpo_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    company_name = db.Column(db.String(150), nullable=False)
    job_role = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expiry_date = db.Column(db.DateTime, nullable=False) 
    
    applications = db.relationship('PlacementApplication', backref='placement_request', lazy=True, cascade="all, delete-orphan")
    recommendations = db.relationship('TeacherRecommendation', backref='placement_request', lazy=True, cascade="all, delete-orphan")


class PlacementApplication(db.Model):
    __tablename__ = 'placement_applications'

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('placement_requests.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('student_profiles.id'), nullable=False)
    
    status = db.Column(db.String(20), default='Pending')


class RoadmapMilestone(db.Model):
    __tablename__ = 'roadmap_milestones'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student_profiles.id'), nullable=False)
    
    year_number = db.Column(db.Integer, nullable=False) 
    title = db.Column(db.String(150), nullable=False)   
    description = db.Column(db.Text, nullable=True)     
    
    required_skills = db.Column(db.String(200), nullable=True) 
    sub_tasks = db.Column(db.Text, nullable=True)              
    resource_link = db.Column(db.String(300), nullable=True)   
    
    is_completed = db.Column(db.Boolean, default=False)


class TeacherRecommendation(db.Model):
    __tablename__ = 'teacher_recommendations'

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('placement_requests.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('student_profiles.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teacher_profiles.id'), nullable=False)
    
    reason = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='Pending') 
    created_at = db.Column(db.DateTime, default=datetime.utcnow)