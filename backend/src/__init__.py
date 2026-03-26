from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from datetime import datetime, timedelta
import traceback
import requests
import os
import threading
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from werkzeug.utils import secure_filename
from src.ml.utils import deleteTempFiles
from src.ml.utils import delete_file
from src.ml.utils import check_columns_and_datatypes
from dotenv import load_dotenv

from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from .models import db, bcrypt, User, StudentProfile, Certification, TeacherProfile, PlacementRequest, PlacementApplication, RoadmapMilestone, TeacherRecommendation

load_dotenv() 

from src.ml.predict import predict_college_stats, predict_student_placement

deleteTempFiles()

def compare(compare_list, compare_str):
    for i in compare_list:
        if i in compare_str:
            return True
    return False

# ==========================================
# NEW: CERTIFICATE AUTO-GRADING SYSTEM
# ==========================================
CERTIFICATE_POINTS = {
    'NPTEL': 5,
    'Coursera': 4,
    'edX': 4,
    'Udemy': 3,
    'LinkedIn Learning': 3,
    'Other': 2
}

# --- UPDATED: ADDED GENERAL APTITUDE TEMPLATES ---
ROADMAP_TEMPLATES = {
    "Data Science": [
        {"title": "Foundations: Python & SQL", "desc": "Master the basics of data manipulation and querying.", "skills": "python, sql, database", "tasks": "Solve 20 Basic Python Questions\nLearn SQL Joins and Group By\nComplete Kaggle Python Intro", "link": "https://www.kaggle.com/learn/python"},
        {"title": "Data Viz & BI Tools", "desc": "Learn to tell stories with data.", "skills": "powerbi, tableau, excel, visualization", "tasks": "Build a PowerBI Dashboard\nMaster Advanced Excel\nLearn Descriptive Statistics", "link": "https://powerbi.microsoft.com/en-us/learning/"},
        {"title": "Machine Learning Models", "desc": "Predictive analytics and Scikit-Learn.", "skills": "machine learning, ml, ai, scikit", "tasks": "Build a Regression Model\nUnderstand Classification Algorithms\nComplete Andrew Ng ML Course Intro", "link": "https://www.coursera.org/specializations/machine-learning-introduction"},
        {"title": "Deep Learning & Capstone", "desc": "Advanced AI and real-world implementation.", "skills": "deep learning, neural networks, nlp, tensor", "tasks": "Train a Neural Network\nBuild an NLP/Computer Vision App\nDeploy model using Flask/FastAPI", "link": "https://www.deeplearning.ai/"}
    ],
    "Web Development": [
        {"title": "Frontend Basics", "desc": "The building blocks of the web.", "skills": "html, css, javascript, web", "tasks": "Build a Responsive Landing Page\nMaster CSS Flexbox & Grid\nLearn DOM Manipulation in JS", "link": "https://www.freecodecamp.org/learn/responsive-web-design/"},
        {"title": "Frontend Frameworks", "desc": "Modern UI development.", "skills": "react, angular, vue, ui", "tasks": "Build a React To-Do App\nLearn State Management (Redux/Context)\nMaster API Fetching", "link": "https://react.dev/learn"},
        {"title": "Backend & Databases", "desc": "Server-side logic.", "skills": "node, express, mongodb, sql, backend", "tasks": "Build a REST API using Node/Express\nConnect API to MongoDB/PostgreSQL\nImplement JWT Authentication", "link": "https://nodejs.org/en/learn"},
        {"title": "Full-Stack Integration", "desc": "Bring it all together.", "skills": "mern, fullstack, aws, deployment", "tasks": "Build a complete MERN stack app\nDeploy Frontend to Vercel\nDeploy Backend to Render/AWS", "link": "https://www.theodinproject.com/"}
    ],
    "Cybersecurity": [
        {"title": "Networking & Linux Basics", "desc": "Understand how computers talk.", "skills": "linux, networking, ccna, os", "tasks": "Learn OSI & TCP/IP Models\nMaster basic Linux terminal commands\nSet up a Virtual Machine", "link": "https://www.cisco.com/c/en/us/training-events/training-certifications/certifications/associate/ccna.html"},
        {"title": "Ethical Hacking Intro", "desc": "Learn to find vulnerabilities.", "skills": "ethical hacking, ceh, security", "tasks": "Learn Nmap scanning\nUnderstand common web vulnerabilities (OWASP Top 10)\nPractice on HackTheBox", "link": "https://www.hackthebox.com/"},
        {"title": "Penetration Testing", "desc": "Active exploitation.", "skills": "penetration testing, pentest, kali", "tasks": "Use Metasploit & Burp Suite\nExploit a vulnerable VM\nWrite a basic vulnerability report", "link": "https://tryhackme.com/"},
        {"title": "Incident Response & Capstone", "desc": "Defending and reacting to attacks.", "skills": "incident response, forensics, soc", "tasks": "Learn SIEM basics (Splunk)\nUnderstand Digital Forensics\nParticipate in a CTF competition", "link": "https://www.cybrary.it/"}
    ],
    "Cloud Computing": [
        {"title": "IT & Networking Foundations", "desc": "The prerequisites for cloud.", "skills": "networking, linux, virtualization", "tasks": "Master IP Addressing\nLearn Linux Administration\nUnderstand Hypervisors", "link": "https://aws.amazon.com/training/"},
        {"title": "Cloud Basics (AWS/Azure)", "desc": "Introduction to cloud platforms.", "skills": "aws, azure, cloud, gcp", "tasks": "Deploy an EC2/VM instance\nConfigure Cloud Storage (S3)\nLearn IAM (Identity Access Management)", "link": "https://aws.amazon.com/certification/certified-cloud-practitioner/"},
        {"title": "Cloud Architecture", "desc": "Designing scalable systems.", "skills": "architecture, serverless, lambda", "tasks": "Build a Serverless App (AWS Lambda)\nSet up a Load Balancer\nLearn Database Hosting (RDS)", "link": "https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/"},
        {"title": "DevOps & Containerization", "desc": "Automation and CI/CD.", "skills": "docker, kubernetes, devops, ci/cd", "tasks": "Containerize an app using Docker\nCreate a GitHub Actions CI/CD pipeline\nLearn basics of Kubernetes (K8s)", "link": "https://www.docker.com/101-tutorial/"}
    ]
}

# --- NEW: General Skills for early years ---
GENERAL_MILESTONES = [
    {"title": "Aptitude & Logical Reasoning", "desc": "Build a strong foundation for placement assessments.", "skills": "math, logic, analytical", "tasks": "Practice quantitative aptitude\nSolve logic puzzles\nTake basic reasoning tests", "link": "https://www.indiabix.com/"},
    {"title": "Communication & Soft Skills", "desc": "Enhance your verbal and written communication.", "skills": "communication, english, writing", "tasks": "Daily reading and vocabulary\nWrite technical emails\nPractice public speaking", "link": "https://www.coursera.org/learn/communication"},
    {"title": "Group Discussions & Resumes", "desc": "Prepare for the first round of placements.", "skills": "gd, resume, interview", "tasks": "Participate in mock GDs\nDraft a professional resume\nPractice personal interviews", "link": "https://novoresume.com/"}
]

# --- UPDATED LOGIC: MCA vs IMCA Split & Status Preservation ---
def generate_milestones(student_id, preference, duration, existing_milestones=None):
    if existing_milestones is None:
        existing_milestones = {}
        
    template = ROADMAP_TEMPLATES.get(preference, ROADMAP_TEMPLATES["Web Development"]) 
    milestones = []
    
    if duration == 2: # MCA (2 Years)
        # Year 1: General Aptitude & GD
        m1 = GENERAL_MILESTONES[0]
        milestones.append(RoadmapMilestone(student_id=student_id, year_number=1, title="Year 1 (General): " + m1["title"], description=m1["desc"], required_skills=m1["skills"], sub_tasks=m1["tasks"], resource_link=m1["link"], is_completed=existing_milestones.get(1, False)))
        # Year 2: Area of Interest Specialization
        m2 = template[3]
        milestones.append(RoadmapMilestone(student_id=student_id, year_number=2, title="Year 2 (Specialization): " + m2["title"], description=m2["desc"], required_skills=m2["skills"], sub_tasks=m2["tasks"], resource_link=m2["link"], is_completed=existing_milestones.get(2, False)))
        
    elif duration == 5: # IMCA (5 Years)
        # Year 1: Aptitude
        m1 = GENERAL_MILESTONES[0]
        milestones.append(RoadmapMilestone(student_id=student_id, year_number=1, title="Year 1 (General): " + m1["title"], description=m1["desc"], required_skills=m1["skills"], sub_tasks=m1["tasks"], resource_link=m1["link"], is_completed=existing_milestones.get(1, False)))
        # Year 2: Communication
        m2 = GENERAL_MILESTONES[1]
        milestones.append(RoadmapMilestone(student_id=student_id, year_number=2, title="Year 2 (General): " + m2["title"], description=m2["desc"], required_skills=m2["skills"], sub_tasks=m2["tasks"], resource_link=m2["link"], is_completed=existing_milestones.get(2, False)))
        # Year 3: GD & Resume
        m3 = GENERAL_MILESTONES[2]
        milestones.append(RoadmapMilestone(student_id=student_id, year_number=3, title="Year 3 (General): " + m3["title"], description=m3["desc"], required_skills=m3["skills"], sub_tasks=m3["tasks"], resource_link=m3["link"], is_completed=existing_milestones.get(3, False)))
        # Year 4: Area of Interest Foundations
        m4 = template[0]
        milestones.append(RoadmapMilestone(student_id=student_id, year_number=4, title="Year 4 (Interest): " + m4["title"], description=m4["desc"], required_skills=m4["skills"], sub_tasks=m4["tasks"], resource_link=m4["link"], is_completed=existing_milestones.get(4, False)))
        # Year 5: Area of Interest Capstone
        m5 = template[3]
        milestones.append(RoadmapMilestone(student_id=student_id, year_number=5, title="Year 5 (Specialization): " + m5["title"], description=m5["desc"], required_skills=m5["skills"], sub_tasks=m5["tasks"], resource_link=m5["link"], is_completed=existing_milestones.get(5, False)))
    
    else: 
        # Fallback for standard degrees
        for i in range(min(duration, 4)):
            m = template[i]
            milestones.append(RoadmapMilestone(student_id=student_id, year_number=i+1, title=f"Year {i+1}: {m['title']}", description=m["desc"], required_skills=m["skills"], sub_tasks=m["tasks"], resource_link=m["link"], is_completed=existing_milestones.get(i+1, False)))
            
    for m in milestones:
        db.session.add(m)

def create_app(test_config=None):

    app = Flask(__name__, static_url_path='', static_folder='static')
    
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///placemate.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    app.config['JWT_SECRET_KEY'] = 'super-secret-placemate-key-change-this-later' 
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1) 

    db.init_app(app)
    bcrypt.init_app(app)
    jwt = JWTManager(app)

    # --- NEW: Added Profile Photo and Resume Directories ---
    certs_dir = os.path.join(app.static_folder, 'certs')
    os.makedirs(certs_dir, exist_ok=True)
    profiles_dir = os.path.join(app.static_folder, 'profiles')
    os.makedirs(profiles_dir, exist_ok=True)
    resumes_dir = os.path.join(app.static_folder, 'resumes')
    os.makedirs(resumes_dir, exist_ok=True)

    with app.app_context():
        db.create_all()

    CORS(app)

    @app.get('/')
    def Check():
        return {
            'status': 'Working....'
        }

    @app.post("/api/predict-campus-placements")
    @cross_origin(origins='*')
    def PredictCampusPlacements():
        try:
            campus_data_file = request.files.get('file')

            if not campus_data_file or campus_data_file.filename == '':
                return {
                    'message': '[file] key not found or file is empty. Please upload an excel file to fetch insights.'
                }, 400

            isError, errorMessage = check_columns_and_datatypes(campus_data_file)

            if isError:
                return {
                    'message': errorMessage
                }, 400

            stats, download_url = predict_college_stats(campus_data_file)

            temp_file_url_path = os.path.join(
                os.path.dirname(__file__), 'static', 'temp', download_url.split('/')[2])

            timer = threading.Timer(
                60*60, delete_file, args=[temp_file_url_path])
            timer.start()

            return {
                'status': 'file uploaded....',
                'stats': stats,
                'download_url': download_url
            }
        except TypeError as type_error:
            return {
                'message': str(type_error)
            }, 400
        except Exception as e:
            return {
                'message': 'Something went wrong.',
                'stack': traceback.format_exc()
            }, 500

    @app.post('/api/predict-student-placement')
    @cross_origin(origins='*')
    def PredictStudentPlacement():
        try:
            data = request.json
            predictions = predict_student_placement(data)
            return predictions, 200
        except Exception as e:
            return {
                'message': 'Something went wrong.',
                'stack': traceback.format_exc()
            }, 500

    @app.post("/api/resume-parser")
    @cross_origin(origins='*')
    def ResumeParser():
        try:
            resume_file = request.files.get('file')
            
            if not resume_file or resume_file.filename == '':
                return {
                    'message': 'File not found. Make sure you uploaded the resume file.'
                }, 400
                
            resume_file_binary = resume_file.read()

            url = "https://api.affinda.com/v3/documents"

            files = {"file": (resume_file.filename,
                              resume_file_binary, "application/pdf")}
            payload = {
                "wait": "true",
                "workspace": "HDcnihTc"
            }
            
            api_key = os.getenv('RESUME_PARSER_API', '')
            headers = {
                "accept": "application/json",
                "authorization": f"Bearer {api_key}" 
            }

            response = requests.post(
                url, data=payload, files=files, headers=headers)

            details = {
                "tier": None, "cgpa": None, "inter_gpa": None, "ssc_gpa": None,
                "internships": 0, "no_of_projects": 0, "is_participate_hackathon": 0,
                "is_participated_extracurricular": 0, "no_of_programming_languages": 0,
                "dsa": 0, "mobile_dev": 0, "web_dev": 0, "Machine Learning": 0,
                "cloud": 0, "CSE": 0, "ECE": 0, "IT": 0, "MECH": 0
            }

            if not response.ok:
                return {"message": "Failed to parse resume via Affinda API", "details": response.text}, 500

            data = response.json().get("data", {})

            try:
                if data.get('education') is not None:
                    for i in data["education"]:
                        if(i.get('accreditation') is not None and i["accreditation"].get("education") is not None and i.get('organization') is not None):

                            if ((i["accreditation"]["educationLevel"] is not None and 'bachelors' in i["accreditation"]["educationLevel"].lower()) or (i["accreditation"]["inputStr"] is not None and ('bachelors' in i["accreditation"]["inputStr"].lower() or 'btech' in i["accreditation"]["inputStr"].lower())) or (i["organization"] is not None and 'engineering' in i["organization"].lower())):

                                details["cgpa"] = i["grade"]["value"]

                                branch = i["accreditation"]["education"].lower()
                                if compare(['cse', 'computer', 'csbs', 'cst'], branch):
                                    details["CSE"] = 1
                                elif compare(['communication', 'ece'], branch):
                                    details['ECE'] = 1
                                elif compare(['mechanical', 'mech'], branch):
                                    details["MECH"] = 1

                            elif ((i["accreditation"]["inputStr"] is not None and 'inter' in i["accreditation"]["inputStr"].lower()) or (i['accreditation']['education'] is not None and 'mpc' in i['accreditation']['education'].lower())):
                                details["inter_gpa"] = i["grade"]["value"]
                            elif((i["organization"] is not None and 'school' in i["organization"].lower()) or (i["accreditation"]["inputStr"] is not None and 'ssc' in i["accreditation"]["inputStr"].lower())):
                                details["ssc_gpa"] = i["grade"]["value"]
            except:
                pass

            try:
                if 'hackathon' in data.get("rawText", ""):
                    details['is_participate_hackathon'] = 1
                if compare(['member', 'contest', 'participated', 'volunteer', 'activit'], data.get('rawText', '')):
                    details['is_participated_extracurricular'] = 1
            except:
                pass

            try:
                for i in data.get("skills", []):
                    name = i["name"].lower()
                    if compare(["dsa", "data structures", "algorithms"], name):
                        details['dsa'] = 1
                    if compare(['html', 'css', 'javascript', 'mern'], name):
                        details['web_dev'] = 1
                    if compare(['machine learning', 'data science'], name):
                        details["Machine Learning"] = 1
                    if compare(['cloud', 'aws', 'azure'], name):
                        details['cloud'] = 1
                    if compare(['mobile', 'flutter', 'react native', 'swift', 'kotlin'], name):
                        details['mobile_dev'] = 1
                    if compare(['java', 'c++', 'python', 'golang', 'javascript', 'c#', 'php'], name):
                        details['no_of_programming_languages'] += 1
            except:
                pass

            try:
                if data.get('workExperience') is not None:
                    details['internships'] = len(data["workExperience"])
            except:
                pass

            studentName = "Unknown"
            try:
                if data.get('name') and data['name'].get('raw'):
                    studentName = data['name']['raw']
            except:
                pass
                
            return {"details": details, "studentName": studentName}

        except Exception as e:
            return {
                'message': 'Something went wrong.',
                'stack': traceback.format_exc()
            }, 500

    @app.post("/api/recommendSkills")
    @cross_origin(origins='*')
    def RecommendSkills():
        body = request.get_json()
        print("hit", body.get('skills', []))
        url = "https://api.affinda.com/v3/resume_search/suggestion_skill?"
        
        for i in body.get('skills', []):
            if i == 'mobile_dev':
                skill = "mobile"
            elif i == 'web_dev':
                skill = "web"
            elif i == 'dsa':
                skill = "data structures"
            else:
                skill = i

            url = url + 'skills='+skill+'&'
        print(url)

        api_key = os.getenv('RESUME_PARSER_API', '')
        headers = {
            "accept": "application/json",
            "authorization": f"Bearer {api_key}"
        }

        response = requests.get(url, headers=headers)

        return response.json()

    @app.get('/api/check-admin')
    @cross_origin(origins='*')
    def check_admin_exists():
        admin = User.query.filter_by(role='Admin').first()
        return jsonify({"adminExists": admin is not None}), 200

    @app.route('/api/change-password', methods=['PUT'])
    @cross_origin(origins='*')
    @jwt_required()
    def change_password():
        current_username = get_jwt_identity()
        user = User.query.filter_by(username=current_username).first()
        data = request.get_json()

        old_password = data.get('old_password')
        new_password = data.get('new_password')

        if not old_password or not new_password:
            return jsonify({"message": "Please provide both old and new passwords."}), 400

        if not user.check_password(old_password):
            return jsonify({"message": "Incorrect current password!"}), 401

        user.set_password(new_password)
        db.session.commit()
        
        return jsonify({"message": "Password changed successfully!"}), 200

    # ==========================================
    # VERSION 3.0: AUTHENTICATION ROUTES
    # ==========================================

    @app.post('/api/register')
    @cross_origin(origins='*')
    def register():
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        email = data.get('email') 
        role = data.get('role', 'Student') 
        
        batch = data.get('batch')
        branch = data.get('branch')
        full_name = data.get('full_name')
        gender = data.get('gender')
        program_duration = data.get('program_duration')

        if not username or not password or not email:
            return jsonify({"message": "Username, email, and password are required!"}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({"message": "Username already exists! Please choose another."}), 400
            
        if User.query.filter_by(email=email).first():
            return jsonify({"message": "Email already registered!"}), 400

        if role == 'Student' and (not batch or not branch or not full_name or not gender or not program_duration):
            return jsonify({"message": "Full Name, Batch Year, Department, Gender, and Program are required for Students!"}), 400

        if role == 'Admin':
            existing_admin = User.query.filter_by(role='Admin').first()
            if existing_admin:
                return jsonify({"message": "Registration failed: An Admin is already registered. Only one Admin is allowed."}), 403
            initial_status = 'approved' 
        elif role == 'Student':
            initial_status = 'pending' 
        else:
            initial_status = 'pending' 

        new_user = User(username=username, email=email, role=role, status=initial_status)
        new_user.set_password(password) 
        
        db.session.add(new_user)
        db.session.commit()

        if role == 'Student':
            new_profile = StudentProfile(
                user_id=new_user.id,
                full_name=full_name,
                batch=batch,
                branch=branch,
                gender=gender,
                program_duration=int(program_duration),
                verification_status='Pending',
                sgpa_history={},
                active_backlogs=0
            )
            db.session.add(new_profile)
            db.session.commit()

        if role == 'Admin':
            return jsonify({"message": "Success! Superuser Admin account created."}), 201
        elif role == 'Student':
            return jsonify({"message": "Registration successful! Your account is pending Teacher approval. You cannot log in yet."}), 201
        else:
            return jsonify({"message": f"Registration successful! Pending Admin Approval for {role} role."}), 201

    @app.post('/api/login')
    @cross_origin(origins='*')
    def login():
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        user = User.query.filter_by(username=username).first()

        if not user or not user.check_password(password):
            return jsonify({"message": "Invalid username or password!"}), 401

        if user.status == 'pending':
            return jsonify({"message": "Login Failed: Your account is pending Teacher/Admin approval."}), 403
        elif user.status == 'rejected':
            return jsonify({"message": "Login Failed: Your account request was rejected."}), 403

        access_token = create_access_token(
            identity=user.username, 
            additional_claims={"role": user.role}
        )

        # --- Fetch profile photo if student ---
        profile_photo_url = None
        if hasattr(user, 'profile_photo_url') and user.profile_photo_url:
            profile_photo_url = user.profile_photo_url
        elif user.role == 'Student':
            sp = StudentProfile.query.filter_by(user_id=user.id).first()
            if sp and sp.profile_photo_url:
                profile_photo_url = sp.profile_photo_url

        return jsonify({
            "message": "Login successful!",
            "access_token": access_token,
            "role": user.role,
            "username": user.username,
            "email": user.email,
            "profile_photo_url": profile_photo_url # Send photo to frontend for Header
        }), 200

    # ==========================================
    # STUDENT DASHBOARD ROUTES
    # ==========================================

    @app.route('/api/student/profile', methods=['GET', 'POST'])
    @cross_origin(origins='*')
    @jwt_required()
    def manage_student_profile():
        current_username = get_jwt_identity()
        claims = get_jwt()
        
        if claims.get('role') != 'Student':
            return jsonify({"message": "Access forbidden: Students only"}), 403

        user = User.query.filter_by(username=current_username).first()

        if request.method == 'POST':
            # --- UPDATED: Allow multipart/form-data for file uploads ---
            data = request.form if request.form else request.get_json(silent=True) or {}
            
            profile = StudentProfile.query.filter_by(user_id=user.id).first()
            
            is_approved = profile and profile.verification_status == 'Approved'

            if not profile:
                profile = StudentProfile(user_id=user.id)
                db.session.add(profile)

            # --- ONLY UPDATE TEXT FIELDS IF NOT APPROVED ---
            if not is_approved:
                profile.full_name = data.get('full_name', profile.full_name)
                profile.batch = data.get('batch', profile.batch)
                profile.branch = data.get('branch', profile.branch)
                profile.gender = data.get('gender', profile.gender)
                profile.verification_status = 'Pending' 

            # --- ALWAYS ALLOW PHOTO & RESUME UPDATES ---
            photo = request.files.get('profile_photo')
            if photo and photo.filename != '':
                filename = secure_filename(f"photo_{user.id}_{int(datetime.now().timestamp())}_{photo.filename}")
                photo_path = os.path.join(app.static_folder, 'profiles', filename)
                photo.save(photo_path)
                profile.profile_photo_url = f"/profiles/{filename}"

            resume = request.files.get('resume')
            if resume and resume.filename != '':
                filename = secure_filename(f"resume_{user.id}_{int(datetime.now().timestamp())}_{resume.filename}")
                resume_path = os.path.join(app.static_folder, 'resumes', filename)
                resume.save(resume_path)
                profile.resume_url = f"/resumes/{filename}"

            db.session.commit()
            
            msg = "Media updated successfully!" if is_approved else "Profile updated and sent to Teacher for verification!"
            
            return jsonify({
                "message": msg,
                "profile_photo_url": profile.profile_photo_url
            }), 200

        profile = StudentProfile.query.filter_by(user_id=user.id).first()
        if not profile:
            return jsonify({"message": "Profile not set up yet."}), 404

        certifications = Certification.query.filter_by(student_id=profile.id).all()
        
        # --- UPDATED: Returns source and status for Auto-grading feature ---
        certs_data = [{
            "id": c.id, 
            "name": c.name, 
            "category": c.category, 
            "specific_skill": c.specific_skill, 
            "is_verified": c.is_verified,
            "grade_point": c.grade_point,
            "source": getattr(c, 'source', 'Other'),
            "status": getattr(c, 'status', 'Pending'),
            "file_url": c.file_url 
        } for c in certifications]
        
        total_score = sum(c.grade_point for c in certifications if c.is_verified)

        return jsonify({
            "id": profile.id,
            "full_name": profile.full_name,
            "batch": profile.batch,
            "branch": profile.branch,
            "gender": profile.gender,
            "gpa": profile.gpa,
            "sgpa_history": profile.sgpa_history or {}, 
            "active_backlogs": profile.active_backlogs,
            "verification_status": profile.verification_status,
            "current_year": profile.current_year, 
            "program_duration": profile.program_duration, 
            "roadmap_preference": profile.roadmap_preference,
            "total_grade_points": total_score, 
            "certifications": certs_data,
            "profile_photo_url": profile.profile_photo_url, # --- Export Media
            "resume_url": profile.resume_url # --- Export Media
        }), 200

    @app.route('/api/student/certification', methods=['POST'])
    @cross_origin(origins='*')
    @jwt_required()
    def add_certification():
        current_username = get_jwt_identity()
        claims = get_jwt()
        
        if claims.get('role') != 'Student':
            return jsonify({"message": "Access forbidden: Students only"}), 403

        user = User.query.filter_by(username=current_username).first()
        profile = StudentProfile.query.filter_by(user_id=user.id).first()

        if not profile:
            return jsonify({"message": "Please set up your basic profile first!"}), 400

        name = request.form.get('name')
        category = request.form.get('category')
        specific_skill = request.form.get('specific_skill') 
        source = request.form.get('source', 'Other') # --- NEW: Source mapping
        file = request.files.get('file')

        if not name or not category or not specific_skill or not file:
            return jsonify({"message": "Certification details and PDF file are required!"}), 400

        filename = secure_filename(f"cert_{profile.id}_{int(datetime.now().timestamp())}_{file.filename}")
        file_path = os.path.join(app.static_folder, 'certs', filename)
        file.save(file_path)
        file_url = f"/certs/{filename}"

        # --- UPDATED: Save source and default status ---
        new_cert = Certification(student_id=profile.id, name=name, category=category, specific_skill=specific_skill, source=source, status='Pending', is_verified=False, file_url=file_url)
        db.session.add(new_cert)
        db.session.commit()

        return jsonify({"message": "Certification added successfully and is pending teacher verification."}), 201

    @app.route('/api/student/job-requests', methods=['GET'])
    @cross_origin(origins='*')
    @jwt_required()
    def get_job_requests():
        if get_jwt().get('role') != 'Student': 
            return jsonify({"message": "Forbidden"}), 403
        
        user = User.query.filter_by(username=get_jwt_identity()).first()
        profile = StudentProfile.query.filter_by(user_id=user.id).first()
        if not profile: 
            return jsonify([]), 200
        
        apps = PlacementApplication.query.filter_by(student_id=profile.id).all()
        results = []
        has_changes = False

        for a in apps:
            req = PlacementRequest.query.get(a.request_id)
            
            if a.status == 'Pending' and req.expiry_date and datetime.now() > req.expiry_date:
                a.status = 'Expired'
                has_changes = True

            results.append({
                "application_id": a.id,
                "company_name": req.company_name,
                "job_role": req.job_role,
                "description": req.description,
                "status": a.status,
                "created_at": req.created_at.strftime("%Y-%m-%d"),
                "expiry_date": req.expiry_date.strftime("%Y-%m-%d %I:%M %p") if req.expiry_date else None
            })
            
        if has_changes:
            db.session.commit()

        return jsonify(results), 200

    @app.route('/api/student/job-requests/<int:app_id>', methods=['PUT'])
    @cross_origin(origins='*')
    @jwt_required()
    def respond_job_request(app_id):
        if get_jwt().get('role') != 'Student': 
            return jsonify({"message": "Forbidden"}), 403
        
        user = User.query.filter_by(username=get_jwt_identity()).first()
        profile = StudentProfile.query.filter_by(user_id=user.id).first()
        
        application = PlacementApplication.query.get(app_id)
        if not application or application.student_id != profile.id: 
            return jsonify({"message": "Application not found or unauthorized"}), 404
            
        req = PlacementRequest.query.get(application.request_id)
        
        if req.expiry_date and datetime.now() > req.expiry_date:
            application.status = 'Expired'
            db.session.commit()
            return jsonify({"message": "Sorry, this job offer has expired!"}), 400

        data = request.get_json()
        new_status = data.get('status')
        if new_status in ['Accepted', 'Rejected']:
            application.status = new_status
            db.session.commit()
            return jsonify({"message": f"Successfully marked as {new_status}!"}), 200
        return jsonify({"message": "Invalid status."}), 400

    @app.route('/api/student/setup-roadmap', methods=['POST'])
    @cross_origin(origins='*')
    @jwt_required()
    def setup_student_roadmap():
        if get_jwt().get('role') != 'Student': return jsonify({"message": "Forbidden"}), 403
        profile = StudentProfile.query.filter_by(user_id=User.query.filter_by(username=get_jwt_identity()).first().id).first()
        if not profile: return jsonify({"message": "Please complete your basic profile first."}), 400
        
        data = request.get_json()
        profile.roadmap_preference = data.get('preference')
        
        if not profile.current_year:
            profile.current_year = 1 
            
        # Preserve completed statuses before wiping
        existing_milestones = {}
        old_milestones = RoadmapMilestone.query.filter_by(student_id=profile.id).all()
        for m in old_milestones:
            existing_milestones[m.year_number] = m.is_completed
            db.session.delete(m)
            
        db.session.commit()
        
        generate_milestones(profile.id, profile.roadmap_preference, profile.program_duration, existing_milestones)
        db.session.commit()
        return jsonify({"message": "Roadmap successfully updated!"}), 201

    @app.route('/api/student/roadmap', methods=['GET'])
    @cross_origin(origins='*')
    @jwt_required()
    def get_student_roadmap():
        if get_jwt().get('role') != 'Student': return jsonify({"message": "Forbidden"}), 403
        profile = StudentProfile.query.filter_by(user_id=User.query.filter_by(username=get_jwt_identity()).first().id).first()
        if not profile or not profile.roadmap_preference: return jsonify({"message": "No roadmap set"}), 404
            
        milestones = RoadmapMilestone.query.filter_by(student_id=profile.id).order_by(RoadmapMilestone.year_number).all()
        return jsonify({
            "current_year": profile.current_year,
            "program_duration": profile.program_duration,
            "preference": profile.roadmap_preference,
            "milestones": [{"id": m.id, "year_number": m.year_number, "title": m.title, "description": m.description, "required_skills": m.required_skills, "sub_tasks": m.sub_tasks, "resource_link": m.resource_link, "is_completed": m.is_completed} for m in milestones]
        }), 200

    # ==========================================
    # TEACHER DASHBOARD ROUTES
    # ==========================================

    @app.route('/api/teacher/profile', methods=['GET', 'POST'])
    @cross_origin(origins='*')
    @jwt_required()
    def manage_teacher_profile():
        current_username = get_jwt_identity()
        claims = get_jwt()
        if claims.get('role') != 'Teacher': return jsonify({"message": "Access forbidden: Teachers only"}), 403
        
        user = User.query.filter_by(username=current_username).first()

        if request.method == 'POST':
            # --- UPDATED: Uses multipart/form-data to accept Teacher Photos ---
            data = request.form if request.form else request.get_json(silent=True) or {}
            profile = TeacherProfile.query.filter_by(user_id=user.id).first()
            
            photo = request.files.get('profile_photo')
            photo_updated = False
            
            if photo and photo.filename != '':
                filename = secure_filename(f"photo_{user.id}_{int(datetime.now().timestamp())}_{photo.filename}")
                photo_path = os.path.join(app.static_folder, 'profiles', filename)
                photo.save(photo_path)
                user.profile_photo_url = f"/profiles/{filename}"
                photo_updated = True
                
            req_batch = data.get('assigned_batch')
            req_branch = data.get('assigned_branch')
            req_role = data.get('advisor_role')

            if req_batch or req_branch or req_role:
                if not req_batch or not req_branch or not req_role:
                    return jsonify({"message": "Batch, Branch, and Advisor Role are all required to set jurisdiction!"}), 400
                
                if profile and profile.assigned_batch and profile.assigned_branch:
                    if str(req_batch) != str(profile.assigned_batch) or str(req_branch) != str(profile.assigned_branch):
                        if photo_updated:
                            db.session.commit()
                            return jsonify({"message": "Photo saved, but jurisdiction is permanently locked.", "profile_photo_url": user.profile_photo_url}), 200
                        return jsonify({"message": "Jurisdiction is permanently locked. You cannot change your assigned batch."}), 400
                        
                if not profile:
                    profile = TeacherProfile(user_id=user.id)
                    db.session.add(profile)

                if req_role == 'CSA':
                    existing_csa = TeacherProfile.query.filter_by(assigned_batch=req_batch, assigned_branch=req_branch, advisor_role='CSA').first()
                    if existing_csa and existing_csa.user_id != user.id:
                        return jsonify({"message": f"Action Denied: A Chief Staff Advisor (CSA) is already assigned for {req_batch} - {req_branch}."}), 400
                elif req_role == 'SA':
                    existing_sas = TeacherProfile.query.filter_by(assigned_batch=req_batch, assigned_branch=req_branch, advisor_role='SA').count()
                    if existing_sas >= 2:
                        return jsonify({"message": f"Action Denied: The maximum of 2 Staff Advisors (SA) has already been reached for {req_batch} - {req_branch}."}), 400

                profile.assigned_batch = req_batch
                profile.assigned_branch = req_branch
                profile.advisor_role = req_role

            db.session.commit()
            msg = "Teacher profile updated successfully!"
            if photo_updated and not (req_batch or req_branch or req_role):
                msg = "Profile photo updated successfully!"
                
            return jsonify({
                "message": msg,
                "profile_photo_url": getattr(user, 'profile_photo_url', None)
            }), 200

        profile = TeacherProfile.query.filter_by(user_id=user.id).first()
        return jsonify({ 
            "id": profile.id if profile else None, 
            "assigned_batch": profile.assigned_batch if profile else '', 
            "assigned_branch": profile.assigned_branch if profile else '', 
            "advisor_role": profile.advisor_role if profile else '',
            "profile_photo_url": getattr(user, 'profile_photo_url', None)
        }), 200

    @app.route('/api/teacher/students', methods=['GET'])
    @cross_origin(origins='*')
    @jwt_required()
    def get_assigned_students():
        current_username = get_jwt_identity()
        claims = get_jwt()
        
        if claims.get('role') != 'Teacher':
            return jsonify({"message": "Access forbidden: Teachers only"}), 403

        user = User.query.filter_by(username=current_username).first()
        teacher = TeacherProfile.query.filter_by(user_id=user.id).first()

        if not teacher or not teacher.assigned_batch or not teacher.assigned_branch:
            return jsonify({"message": "Please set your assigned batch and branch first!"}), 400

        students = StudentProfile.query.filter_by(
            batch=teacher.assigned_batch, 
            branch=teacher.assigned_branch
        ).all()

        students_data = []
        for s in students:
            certs = Certification.query.filter_by(student_id=s.id).all()
            
            # --- UPDATED: Also return source and status to Teacher ---
            certs_data = [{
                "id": c.id, 
                "name": c.name, 
                "category": c.category, 
                "specific_skill": c.specific_skill, 
                "is_verified": c.is_verified,
                "grade_point": c.grade_point,
                "source": getattr(c, 'source', 'Other'),
                "status": getattr(c, 'status', 'Pending'),
                "file_url": c.file_url 
            } for c in certs]
            
            total_score = sum(c.grade_point for c in certs if c.is_verified)
            
            students_data.append({
                "id": s.id,
                "full_name": s.full_name,
                "batch": s.batch,
                "branch": s.branch,
                "gender": s.gender,
                "gpa": s.gpa,
                "sgpa_history": s.sgpa_history or {}, 
                "active_backlogs": s.active_backlogs,
                "verification_status": s.verification_status, 
                "current_year": s.current_year, 
                "program_duration": s.program_duration, 
                "roadmap_preference": s.roadmap_preference,
                "total_grade_points": total_score,
                "certifications": certs_data,
                "profile_photo_url": s.profile_photo_url, # Fetch Media
                "resume_url": s.resume_url # Fetch Media
            })

        return jsonify(students_data), 200

    @app.route('/api/teacher/student/<int:student_id>/verify-profile', methods=['PUT'])
    @cross_origin(origins='*')
    @jwt_required()
    def teacher_verify_profile(student_id):
        if get_jwt().get('role') != 'Teacher': return jsonify({"message": "Forbidden"}), 403
        
        teacher = TeacherProfile.query.filter_by(user_id=User.query.filter_by(username=get_jwt_identity()).first().id).first()
        student = StudentProfile.query.get(student_id)
        
        if not student or student.batch != teacher.assigned_batch or student.branch != teacher.assigned_branch:
             return jsonify({"message": "Unauthorized"}), 403
        
        status = request.get_json().get('status')
        if status in ['Approved', 'Rejected']:
            student.verification_status = status
            
            student_user = User.query.get(student.user_id)
            if status == 'Approved':
                student_user.status = 'approved'
            elif status == 'Rejected':
                student_user.status = 'rejected'
                
            db.session.commit()
            return jsonify({"message": f"Profile successfully marked as {status} and account unlocked!"}), 200
        return jsonify({"message": "Invalid status."}), 400

    @app.route('/api/teacher/student/<int:student_id>/edit', methods=['PUT'])
    @cross_origin(origins='*')
    @jwt_required()
    def teacher_edit_student(student_id):
        if get_jwt().get('role') != 'Teacher': return jsonify({"message": "Forbidden"}), 403
        
        teacher = TeacherProfile.query.filter_by(user_id=User.query.filter_by(username=get_jwt_identity()).first().id).first()
        student = StudentProfile.query.get(student_id)
        
        if not student or student.batch != teacher.assigned_batch or student.branch != teacher.assigned_branch:
             return jsonify({"message": "Unauthorized"}), 403
             
        data = request.get_json()
        student.full_name = data.get('full_name', student.full_name)
        student.batch = data.get('batch', student.batch)
        student.branch = data.get('branch', student.branch)
        student.gender = data.get('gender', student.gender)
        
        # --- FIXED: GPA safely handles empty strings ---
        gpa_val = data.get('gpa')
        if gpa_val == '' or gpa_val is None:
            student.gpa = None
        else:
            student.gpa = float(gpa_val)
        
        # --- FIXED: Active Backlogs safely handles empty strings ---
        if 'active_backlogs' in data:
            backlogs_val = data.get('active_backlogs')
            if backlogs_val == '' or backlogs_val is None:
                student.active_backlogs = 0
            else:
                student.active_backlogs = int(backlogs_val)
        
        db.session.commit()
        return jsonify({"message": "Student Profile Updated!"}), 200

    @app.route('/api/teacher/student/<int:student_id>/gpa', methods=['PUT'])
    @cross_origin(origins='*')
    @jwt_required()
    def update_student_gpa(student_id):
        current_username = get_jwt_identity()
        claims = get_jwt()
        if claims.get('role') != 'Teacher':
            return jsonify({"message": "Access forbidden: Teachers only"}), 403

        user = User.query.filter_by(username=current_username).first()
        teacher = TeacherProfile.query.filter_by(user_id=user.id).first()
        
        if not teacher or not teacher.assigned_batch:
            return jsonify({"message": "You must set your assigned batch first!"}), 400

        student = StudentProfile.query.get(student_id)
        if not student:
            return jsonify({"message": "Student not found!"}), 404

        if student.batch != teacher.assigned_batch or student.branch != teacher.assigned_branch:
            return jsonify({"message": f"Unauthorized: This student belongs to {student.batch}-{student.branch}. You can only edit {teacher.assigned_batch}-{teacher.assigned_branch}."}), 403

        data = request.get_json()
        sgpa_history = data.get('sgpa_history', {})
        
        student.sgpa_history = sgpa_history
        
        valid_scores = []
        for sem, score in sgpa_history.items():
            try:
                if score is not None and str(score).strip() != '':
                    valid_scores.append(float(score))
            except ValueError:
                pass
                
        if len(valid_scores) > 0:
            student.gpa = round(sum(valid_scores) / len(valid_scores), 2)
        else:
            student.gpa = None

        db.session.commit()
        return jsonify({"message": f"Academic records updated for {student.full_name}. New CGPA: {student.gpa}"}), 200

    @app.route('/api/teacher/certification/<int:cert_id>/verify', methods=['PUT'])
    @cross_origin(origins='*')
    @jwt_required()
    def verify_certification(cert_id):
        current_username = get_jwt_identity()
        claims = get_jwt()
        if claims.get('role') != 'Teacher':
            return jsonify({"message": "Access forbidden: Teachers only"}), 403

        user = User.query.filter_by(username=current_username).first()
        teacher = TeacherProfile.query.filter_by(user_id=user.id).first()

        cert = Certification.query.get(cert_id)
        if not cert:
            return jsonify({"message": "Certification not found!"}), 404
        
        student = StudentProfile.query.get(cert.student_id)

        if not student or student.batch != teacher.assigned_batch or student.branch != teacher.assigned_branch:
             return jsonify({"message": "Unauthorized: This student is not in your assigned batch/branch."}), 403

        data = request.get_json(silent=True) or {}
        
        # --- NEW: AUTO-GRADING LOGIC FOR TEACHERS ---
        new_status = data.get('status')

        if new_status == 'Verified' or data.get('is_verified') is True:
            cert.is_verified = True
            cert.status = 'Verified'
            # Look up points based on source, default to 2 if not found
            cert.grade_point = CERTIFICATE_POINTS.get(getattr(cert, 'source', 'Other'), 2)
        elif new_status == 'Rejected' or data.get('is_verified') is False:
            cert.is_verified = False
            cert.status = 'Rejected'
            cert.grade_point = 0
        else:
            # Fallback toggle
            cert.is_verified = not cert.is_verified
            if cert.is_verified:
                cert.status = 'Verified'
                cert.grade_point = CERTIFICATE_POINTS.get(getattr(cert, 'source', 'Other'), 2)
            else:
                cert.status = 'Pending'
                cert.grade_point = 0

        message_extra = ""
        
        if cert.is_verified:
            milestones = RoadmapMilestone.query.filter_by(student_id=cert.student_id, is_completed=False).all()
            for m in milestones:
                if m.required_skills:
                    required_list = [s.strip().lower() for s in m.required_skills.split(',')]
                    if any(req in cert.specific_skill.lower() for req in required_list):
                        m.is_completed = True
                        message_extra = f" (Auto-Completed Roadmap Milestone: {m.title})"
                        break 

        db.session.commit()
        status_msg = "Verified" if cert.is_verified else "Unverified/Rejected"
        return jsonify({"message": f"Certification marked as {status_msg} and automatically graded with {cert.grade_point} points!{message_extra}"}), 200

    # --- UPDATED: FEATURE 4 - Bulk Verify Certifications with Auto-Grading ---
    @app.route('/api/teacher/certifications/bulk-verify', methods=['POST'])
    @cross_origin(origins='*')
    @jwt_required()
    def bulk_verify_certs():
        if get_jwt().get('role') != 'Teacher': return jsonify({"message": "Access forbidden"}), 403
        teacher = TeacherProfile.query.filter_by(user_id=User.query.filter_by(username=get_jwt_identity()).first().id).first()
        
        data = request.get_json()
        cert_ids = data.get('cert_ids', [])

        if not cert_ids: return jsonify({"message": "No certifications selected."}), 400

        certs = Certification.query.filter(Certification.id.in_(cert_ids)).all()
        verified_count = 0
        for cert in certs:
            student = StudentProfile.query.get(cert.student_id)
            if student and student.batch == teacher.assigned_batch and student.branch == teacher.assigned_branch:
                cert.is_verified = True
                cert.status = 'Verified'
                cert.grade_point = CERTIFICATE_POINTS.get(getattr(cert, 'source', 'Other'), 2)
                verified_count += 1
                
                # Auto-complete milestones
                milestones = RoadmapMilestone.query.filter_by(student_id=cert.student_id, is_completed=False).all()
                for m in milestones:
                    if m.required_skills:
                        required_list = [s.strip().lower() for s in m.required_skills.split(',')]
                        if any(req in cert.specific_skill.lower() for req in required_list):
                            m.is_completed = True
                            break

        db.session.commit()
        return jsonify({"message": f"Successfully verified and auto-graded {verified_count} certifications!"}), 200


    @app.route('/api/teacher/student/<int:student_id>/roadmap', methods=['GET'])
    @cross_origin(origins='*')
    @jwt_required()
    def teacher_get_student_roadmap(student_id):
        if get_jwt().get('role') != 'Teacher': return jsonify({"message": "Forbidden"}), 403
        
        teacher = TeacherProfile.query.filter_by(user_id=User.query.filter_by(username=get_jwt_identity()).first().id).first()
        student = StudentProfile.query.get(student_id)
        
        if student.batch != teacher.assigned_batch or student.branch != teacher.assigned_branch:
            return jsonify({"message": "Unauthorized"}), 403

        milestones = RoadmapMilestone.query.filter_by(student_id=student.id).order_by(RoadmapMilestone.year_number).all()
        return jsonify([{"id": m.id, "year_number": m.year_number, "title": m.title, "description": m.description, "is_completed": m.is_completed} for m in milestones]), 200

    @app.route('/api/teacher/milestone/<int:milestone_id>/toggle', methods=['PUT'])
    @cross_origin(origins='*')
    @jwt_required()
    def teacher_toggle_milestone(milestone_id):
        if get_jwt().get('role') != 'Teacher': return jsonify({"message": "Forbidden"}), 403
        
        milestone = RoadmapMilestone.query.get(milestone_id)
        milestone.is_completed = not milestone.is_completed
        db.session.commit()
        
        status = "Completed" if milestone.is_completed else "Pending"
        return jsonify({"message": f"Milestone marked as {status}!"}), 200

    @app.route('/api/teacher/student/<int:student_id>/promote', methods=['PUT'])
    @cross_origin(origins='*')
    @jwt_required()
    def teacher_promote_student(student_id):
        if get_jwt().get('role') != 'Teacher': return jsonify({"message": "Forbidden"}), 403
        
        student = StudentProfile.query.get(student_id)
        if student.current_year >= student.program_duration:
            return jsonify({"message": "Student is already in their final year!"}), 400
            
        student.current_year += 1
        db.session.commit()
        return jsonify({"message": f"Student promoted to Year {student.current_year}!"}), 200

    @app.route('/api/teacher/placement-requests', methods=['GET'])
    @cross_origin(origins='*')
    @jwt_required()
    def teacher_get_placement_requests():
        if get_jwt().get('role') != 'Teacher': return jsonify({"message": "Forbidden"}), 403
        teacher = TeacherProfile.query.filter_by(user_id=User.query.filter_by(username=get_jwt_identity()).first().id).first()
        
        if not teacher or not teacher.assigned_batch: return jsonify([]), 200

        requests = PlacementRequest.query.order_by(PlacementRequest.created_at.desc()).all()
        my_students = StudentProfile.query.filter_by(batch=teacher.assigned_batch, branch=teacher.assigned_branch).all()
        my_student_ids = [s.id for s in my_students]
        
        results = []
        for r in requests:
            apps = PlacementApplication.query.filter_by(request_id=r.id).filter(PlacementApplication.student_id.in_(my_student_ids)).all()
            received_student_ids = [a.student_id for a in apps]
            
            received_students = [{"id": s.id, "name": s.full_name, "status": a.status} for s in my_students for a in apps if s.id == a.student_id]
            not_received_students = [{"id": s.id, "name": s.full_name} for s in my_students if s.id not in received_student_ids]
            
            recs = TeacherRecommendation.query.filter_by(request_id=r.id, teacher_id=teacher.id).all()
            recommendations = [{"student_name": StudentProfile.query.get(rec.student_id).full_name, "status": rec.status, "reason": rec.reason} for rec in recs]
            
            results.append({
                "request_id": r.id,
                "company_name": r.company_name,
                "job_role": r.job_role,
                "description": r.description,
                "expiry_date": r.expiry_date.strftime("%Y-%m-%d %I:%M %p") if r.expiry_date else None,
                "received_students": received_students,
                "eligible_to_recommend": not_received_students,
                "my_recommendations": recommendations
            })
            
        return jsonify(results), 200

    @app.route('/api/teacher/recommend-student', methods=['POST'])
    @cross_origin(origins='*')
    @jwt_required()
    def teacher_recommend_student():
        if get_jwt().get('role') != 'Teacher': return jsonify({"message": "Forbidden"}), 403
        teacher = TeacherProfile.query.filter_by(user_id=User.query.filter_by(username=get_jwt_identity()).first().id).first()
        
        if teacher.advisor_role != 'CSA':
            return jsonify({"message": "Action Denied: Only Chief Staff Advisors (CSA) can recommend students to the TPO."}), 403
            
        data = request.get_json()
        request_id = data.get('request_id')
        student_id = data.get('student_id')
        reason = data.get('reason', '')
        
        if not request_id or not student_id: return jsonify({"message": "Missing request or student ID."}), 400
            
        existing = TeacherRecommendation.query.filter_by(request_id=request_id, student_id=student_id).first()
        if existing: return jsonify({"message": "Student has already been recommended for this job."}), 400
            
        existing_app = PlacementApplication.query.filter_by(request_id=request_id, student_id=student_id).first()
        if existing_app: return jsonify({"message": "Student has already received a job request for this."}), 400
            
        new_rec = TeacherRecommendation(request_id=request_id, student_id=student_id, teacher_id=teacher.id, reason=reason)
        db.session.add(new_rec)
        db.session.commit()
        
        return jsonify({"message": "Recommendation successfully sent to the TPO!"}), 201

    # ==========================================
    # TPO DASHBOARD ROUTES
    # ==========================================
    
    # --- NEW: TPO Own Profile Setup (Photos) ---
    @app.route('/api/tpo/profile', methods=['GET', 'POST'])
    @cross_origin(origins='*')
    @jwt_required()
    def manage_tpo_profile():
        if get_jwt().get('role') != 'TPO': return jsonify({"message": "Access forbidden: TPOs only"}), 403
        user = User.query.filter_by(username=get_jwt_identity()).first()

        if request.method == 'POST':
            photo = request.files.get('profile_photo')
            if photo and photo.filename != '':
                filename = secure_filename(f"photo_{user.id}_{int(datetime.now().timestamp())}_{photo.filename}")
                photo_path = os.path.join(app.static_folder, 'profiles', filename)
                photo.save(photo_path)
                user.profile_photo_url = f"/profiles/{filename}"
                db.session.commit()
                return jsonify({"message": "Profile photo updated successfully!", "profile_photo_url": user.profile_photo_url}), 200
            return jsonify({"message": "No file uploaded."}), 400

        return jsonify({
            "username": user.username,
            "email": user.email,
            "profile_photo_url": getattr(user, 'profile_photo_url', None)
        }), 200

    @app.route('/api/tpo/branches', methods=['GET'])
    @cross_origin(origins='*')
    @jwt_required()
    def tpo_get_branches():
        if get_jwt().get('role') != 'TPO':
            return jsonify({"message": "Forbidden"}), 403
        
        branches = db.session.query(StudentProfile.branch).distinct().all()
        branch_list = [b[0] for b in branches if b[0] and b[0].strip() != '']
        
        return jsonify(branch_list), 200

    @app.route('/api/tpo/filter-students', methods=['POST'])
    @cross_origin(origins='*')
    @jwt_required()
    def tpo_filter_students():
        claims = get_jwt()
        
        if claims.get('role') != 'TPO':
            return jsonify({"message": "Access forbidden: TPOs only"}), 403

        data = request.get_json() or {}
        min_gpa = data.get('min_gpa')
        target_branches = data.get('branches', []) 
        target_batch = data.get('batch')   
        req_cert_category = data.get('cert_category') 
        req_specific_skill = data.get('specific_skill') 
        min_grade_points = data.get('min_grade_points') 
        
        req_program = data.get('program_duration')
        req_pathway = data.get('roadmap_preference')
        req_gender = data.get('gender')
        max_backlogs = data.get('max_backlogs')

        ready_flag = data.get('placement_ready_only', False)
        requires_ready = str(ready_flag).lower() == 'true' or ready_flag is True

        query = StudentProfile.query

        if min_gpa is not None and min_gpa != "":
            try:
                query = query.filter(StudentProfile.gpa >= float(min_gpa))
            except:
                pass

        if target_branches and len(target_branches) > 0:
            query = query.filter(StudentProfile.branch.in_(target_branches))

        if target_batch:
            query = query.filter(StudentProfile.batch == target_batch)

        if req_program and req_program != "":
            query = query.filter(StudentProfile.program_duration == int(req_program))
            
        if req_pathway and req_pathway != "":
            query = query.filter(StudentProfile.roadmap_preference == req_pathway)

        if req_gender and req_gender != "":
            query = query.filter(StudentProfile.gender == req_gender)
            
        if max_backlogs is not None and str(max_backlogs).strip() != "":
            try: 
                query = query.filter(StudentProfile.active_backlogs <= int(max_backlogs))
            except: 
                pass

        students = query.all()
        eligible_students = []

        for s in students:
            verified_certs = [c for c in Certification.query.filter_by(student_id=s.id, is_verified=True).all()]
            total_points = sum(c.grade_point for c in verified_certs)

            if min_grade_points is not None and min_grade_points != "":
                try:
                    if total_points < int(min_grade_points):
                        continue 
                except:
                    pass

            if req_cert_category:
                verified_certs = [c for c in verified_certs if c.category.lower() == req_cert_category.lower()]
            
            if req_specific_skill:
                verified_certs = [c for c in verified_certs if req_specific_skill.lower() in c.specific_skill.lower()]

            if (req_cert_category or req_specific_skill) and len(verified_certs) == 0:
                continue 

            milestones = RoadmapMilestone.query.filter_by(student_id=s.id).order_by(RoadmapMilestone.year_number).all()
            is_placement_ready = len(milestones) > 0 and all(m.is_completed for m in milestones)
            
            if requires_ready and not is_placement_ready:
                continue

            student_user = User.query.get(s.user_id)

            eligible_students.append({
                "id": s.id,
                "full_name": s.full_name,
                "email": student_user.email, 
                "batch": s.batch,
                "branch": s.branch,
                "gender": s.gender,
                "program_duration": s.program_duration,    
                "roadmap_preference": s.roadmap_preference, 
                "current_year": s.current_year,
                "gpa": s.gpa,
                "sgpa_history": s.sgpa_history or {}, 
                "active_backlogs": s.active_backlogs, 
                "total_grade_points": total_points, 
                "is_placement_ready": is_placement_ready,
                "roadmap_details": [{"year_number": m.year_number, "title": m.title, "is_completed": m.is_completed} for m in milestones],
                "verified_certs": [{"name": c.name, "category": c.category, "specific_skill": c.specific_skill, "grade_point": c.grade_point} for c in verified_certs],
                "profile_photo_url": s.profile_photo_url, # Fetch Media
                "resume_url": s.resume_url # Fetch Media
            })

        advisors_data = []
        if target_batch:
            adv_query = TeacherProfile.query.filter_by(assigned_batch=target_batch)
            if target_branches and len(target_branches) > 0:
                adv_query = adv_query.filter(TeacherProfile.assigned_branch.in_(target_branches))
                
            advisors = adv_query.all()
            for adv in advisors:
                adv_user = User.query.get(adv.user_id)
                advisors_data.append({
                    "name": adv_user.username,
                    "email": adv_user.email,
                    "advisor_role": adv.advisor_role,
                    "batch": adv.assigned_batch,
                    "branch": adv.assigned_branch
                })

        return jsonify({ 
            "count": len(eligible_students), 
            "students": eligible_students,
            "advisors": advisors_data 
        }), 200

    @app.route('/api/tpo/send-request', methods=['POST'])
    @cross_origin(origins='*')
    @jwt_required()
    def tpo_send_request():
        if get_jwt().get('role') != 'TPO': 
            return jsonify({"message": "Forbidden"}), 403
        
        data = request.get_json()
        student_ids = data.get('student_ids', [])
        expiry_str = data.get('expiry_date') 
        
        if not student_ids:
            return jsonify({"message": "No students selected!"}), 400
        if not expiry_str:
            return jsonify({"message": "Expiry date is required!"}), 400

        try:
            expiry_dt = datetime.strptime(expiry_str, "%Y-%m-%dT%H:%M")
        except ValueError:
            return jsonify({"message": "Invalid expiry date format."}), 400

        tpo_user = User.query.filter_by(username=get_jwt_identity()).first()
        
        new_request = PlacementRequest(
            tpo_id=tpo_user.id,
            company_name=data.get('company_name'),
            job_role=data.get('job_role'),
            description=data.get('description', ''),
            expiry_date=expiry_dt 
        )
        db.session.add(new_request)
        db.session.commit() 
        
        for sid in student_ids:
            app = PlacementApplication(request_id=new_request.id, student_id=sid)
            db.session.add(app)
        
        db.session.commit()
        return jsonify({"message": f"Success! Request sent with expiry on {expiry_dt.strftime('%Y-%m-%d')}."}), 201

    # --- NEW: FEATURE 2 - Automated Follow-up Reminders ---
    @app.route('/api/tpo/job-requests/<int:req_id>/remind', methods=['POST'])
    @cross_origin(origins='*')
    @jwt_required()
    def tpo_send_reminders(req_id):
        if get_jwt().get('role') != 'TPO': return jsonify({"message": "Forbidden"}), 403
        
        req = PlacementRequest.query.get(req_id)
        if not req: return jsonify({"message": "Request not found"}), 404

        pending_apps = PlacementApplication.query.filter_by(request_id=req_id, status='Pending').all()
        if not pending_apps: return jsonify({"message": "No pending students to remind!"}), 400

        sender_email = os.getenv('SMTP_EMAIL')
        sender_pwd = os.getenv('SMTP_PASSWORD')
        
        reminded_count = 0
        for app in pending_apps:
            student = StudentProfile.query.get(app.student_id)
            student_user = User.query.get(student.user_id)
            
            subject = f"ACTION REQUIRED: Job Offer from {req.company_name}"
            body = f"Hello {student.full_name},\n\nYou have a pending job offer from {req.company_name} for the role of '{req.job_role}'.\n\nThis offer expires on {req.expiry_date.strftime('%Y-%m-%d %I:%M %p')}.\nPlease log in to your dashboard immediately to Accept or Decline this opportunity.\n\nBest regards,\nYour Placement Cell"

            if sender_email and sender_pwd:
                try:
                    msg = MIMEMultipart()
                    msg['From'] = sender_email
                    msg['To'] = student_user.email
                    msg['Subject'] = subject
                    msg.attach(MIMEText(body, 'plain'))

                    server = smtplib.SMTP('smtp.gmail.com', 587)
                    server.starttls()
                    server.login(sender_email, sender_pwd)
                    server.send_message(msg)
                    server.quit()
                    reminded_count += 1
                except Exception as e:
                    print(f"Failed to send email to {student_user.email}: {e}")
            else:
                # Mock email sending for testing without SMTP credentials
                print(f"\n--- MOCK EMAIL TO {student_user.email} ---")
                print(f"Subject: {subject}")
                print(body)
                print("-------------------------------------\n")
                reminded_count += 1
                
        return jsonify({"message": f"Successfully sent reminder emails to {reminded_count} students!"}), 200

    @app.route('/api/tpo/job-requests', methods=['GET'])
    @cross_origin(origins='*')
    @jwt_required()
    def tpo_get_job_requests():
        if get_jwt().get('role') != 'TPO': 
            return jsonify({"message": "Forbidden"}), 403
        
        tpo_user = User.query.filter_by(username=get_jwt_identity()).first()
        requests = PlacementRequest.query.filter_by(tpo_id=tpo_user.id).order_by(PlacementRequest.created_at.desc()).all()
        
        results = []
        has_changes = False

        for r in requests:
            apps = PlacementApplication.query.filter_by(request_id=r.id).all()
            student_responses = []
            
            for a in apps:
                if a.status == 'Pending' and r.expiry_date and datetime.now() > r.expiry_date:
                    a.status = 'Expired'
                    has_changes = True

                student = StudentProfile.query.get(a.student_id)
                student_user = User.query.get(student.user_id)
                
                # --- UPDATED: Included Extra Data for Custom Company Exports (Feature 3) ---
                student_responses.append({
                    "student_name": student.full_name, 
                    "email": student_user.email, 
                    "branch": student.branch, 
                    "status": a.status,
                    "gender": student.gender,
                    "gpa": student.gpa,
                    "active_backlogs": student.active_backlogs,
                    "batch": student.batch,
                    "program_duration": student.program_duration
                })
            
            recs = TeacherRecommendation.query.filter_by(request_id=r.id).all()
            recommendation_data = []
            for rec in recs:
                s = StudentProfile.query.get(rec.student_id)
                t = TeacherProfile.query.get(rec.teacher_id)
                t_user = User.query.get(t.user_id)
                
                verified_certs = [c for c in Certification.query.filter_by(student_id=s.id, is_verified=True).all()]
                total_points = sum(c.grade_point for c in verified_certs)
                milestones = RoadmapMilestone.query.filter_by(student_id=s.id).order_by(RoadmapMilestone.year_number).all()
                is_placement_ready = len(milestones) > 0 and all(m.is_completed for m in milestones)
                student_user = User.query.get(s.user_id)
                
                recommendation_data.append({
                    "recommendation_id": rec.id, "student_id": s.id, "status": rec.status, "reason": rec.reason,
                    "recommender_name": t_user.username, "recommender_batch": t.assigned_batch,
                    "student_profile": {
                        "id": s.id, "full_name": s.full_name, "email": student_user.email, "batch": s.batch, "branch": s.branch, "gender": s.gender,
                        "program_duration": s.program_duration, "roadmap_preference": s.roadmap_preference, "current_year": s.current_year,
                        "gpa": s.gpa, "sgpa_history": s.sgpa_history or {}, "active_backlogs": s.active_backlogs, 
                        "total_grade_points": total_points, "is_placement_ready": is_placement_ready,
                        "roadmap_details": [{"year_number": m.year_number, "title": m.title, "is_completed": m.is_completed} for m in milestones],
                        "verified_certs": [{"name": c.name, "category": c.category, "specific_skill": c.specific_skill, "grade_point": c.grade_point} for c in verified_certs],
                        "profile_photo_url": s.profile_photo_url, "resume_url": s.resume_url
                    }
                })

            results.append({
                "request_id": r.id,
                "company_name": r.company_name,
                "job_role": r.job_role,
                "description": r.description,
                "created_at": r.created_at.strftime("%Y-%m-%d"),
                "expiry_date": r.expiry_date.strftime("%Y-%m-%d %I:%M %p") if r.expiry_date else None,
                "total_sent": len(apps),
                "accepted": len([a for a in apps if a.status == 'Accepted']),
                "responses": student_responses,
                "recommendations": recommendation_data
            })
            
        if has_changes:
            db.session.commit()
            
        return jsonify(results), 200

    @app.route('/api/tpo/handle-recommendation', methods=['POST'])
    @cross_origin(origins='*')
    @jwt_required()
    def tpo_handle_recommendation():
        if get_jwt().get('role') != 'TPO': return jsonify({"message": "Forbidden"}), 403
        data = request.get_json()
        rec_id = data.get('recommendation_id')
        status = data.get('status') 
        
        rec = TeacherRecommendation.query.get(rec_id)
        if not rec: return jsonify({"message": "Recommendation not found"}), 404
        
        rec.status = status
        if status == 'Accepted':
            app = PlacementApplication(request_id=rec.request_id, student_id=rec.student_id)
            db.session.add(app)
            
        db.session.commit()
        return jsonify({"message": f"Recommendation has been {status}!"}), 200

    # ==========================================
    # SUPERUSER ADMIN ROUTES
    # ==========================================
    
    @app.route('/api/admin/requests', methods=['GET'])
    @cross_origin(origins='*')
    @jwt_required()
    def admin_get_requests():
        if get_jwt().get('role') != 'Admin': return jsonify({"message": "Forbidden"}), 403
        users = User.query.filter(User.status == 'pending', User.role != 'Student').all()
        return jsonify([{"id": u.id, "username": u.username, "email": u.email, "role": u.role, "status": u.status} for u in users]), 200

    @app.route('/api/admin/resolve-request/<int:user_id>', methods=['PUT'])
    @cross_origin(origins='*')
    @jwt_required()
    def admin_resolve_request(user_id):
        if get_jwt().get('role') != 'Admin': return jsonify({"message": "Forbidden"}), 403
        user = User.query.get(user_id)
        if not user: return jsonify({"message": "User not found"}), 404
        data = request.get_json()
        new_status = data.get('status') 
        if new_status in ['approved', 'rejected']:
            user.status = new_status
            db.session.commit()
            return jsonify({"message": f"User {user.username} has been {new_status}!"}), 200
        return jsonify({"message": "Invalid status"}), 400

    @app.route('/api/admin/users', methods=['GET'])
    @cross_origin(origins='*')
    @jwt_required()
    def admin_get_users():
        if get_jwt().get('role') != 'Admin': return jsonify({"message": "Forbidden"}), 403
        users = User.query.filter_by(status='approved').all()
        results = []
        for u in users:
            profile_data = None
            profile_photo_url = None
            
            # Grabs photo directly from User model if available (for TPOs and modified Teachers)
            if hasattr(u, 'profile_photo_url') and u.profile_photo_url:
                profile_photo_url = u.profile_photo_url
                
            if u.role == 'Student':
                p = StudentProfile.query.filter_by(user_id=u.id).first()
                if p: 
                    profile_photo_url = p.profile_photo_url
                    profile_data = {
                        "profile_id": p.id, "full_name": p.full_name, "batch": p.batch, "branch": p.branch, "gender": p.gender,
                        "gpa": p.gpa, "sgpa_history": p.sgpa_history or {}, "active_backlogs": p.active_backlogs, 
                        "verification_status": p.verification_status,
                        "profile_photo_url": p.profile_photo_url, "resume_url": p.resume_url 
                    }
            elif u.role == 'Teacher':
                p = TeacherProfile.query.filter_by(user_id=u.id).first()
                if p: 
                    if hasattr(p, 'profile_photo_url') and p.profile_photo_url:
                        profile_photo_url = p.profile_photo_url
                    profile_data = { "profile_id": p.id, "assigned_batch": p.assigned_batch, "assigned_branch": p.assigned_branch, "advisor_role": p.advisor_role }
            
            results.append({ "id": u.id, "username": u.username, "email": u.email, "role": u.role, "profile": profile_data, "profile_photo_url": profile_photo_url })
        return jsonify(results), 200

    @app.route('/api/admin/verify-profile/<int:profile_id>', methods=['PUT'])
    @cross_origin(origins='*')
    @jwt_required()
    def admin_verify_profile(profile_id):
        if get_jwt().get('role') != 'Admin': return jsonify({"message": "Forbidden"}), 403
        profile = StudentProfile.query.get(profile_id)
        if not profile: return jsonify({"message": "Profile not found"}), 404
        status = request.get_json().get('status')
        if status in ['Approved', 'Rejected']:
            profile.verification_status = status
            db.session.commit()
            return jsonify({"message": f"Profile successfully marked as {status}!"}), 200
        return jsonify({"message": "Invalid status."}), 400

    # --- UPDATED: Allow Photo Uploads for Student ---
    @app.route('/api/admin/edit-student/<int:profile_id>', methods=['PUT'])
    @cross_origin(origins='*')
    @jwt_required()
    def admin_edit_student(profile_id):
        if get_jwt().get('role') != 'Admin': return jsonify({"message": "Forbidden"}), 403
        profile = StudentProfile.query.get(profile_id)
        if not profile: return jsonify({"message": "Student Profile not found"}), 404
        
        data = request.form if request.form else request.get_json(silent=True) or {}
        
        profile.full_name = data.get('full_name', profile.full_name)
        profile.batch = data.get('batch', profile.batch)
        profile.branch = data.get('branch', profile.branch)
        profile.gender = data.get('gender', profile.gender)
        
        gpa_val = data.get('gpa')
        if gpa_val == '' or gpa_val is None: profile.gpa = None
        else: profile.gpa = float(gpa_val)

        if 'active_backlogs' in data:
            backlogs_val = data.get('active_backlogs')
            if backlogs_val == '' or backlogs_val is None: profile.active_backlogs = 0
            else: profile.active_backlogs = int(backlogs_val)
            
        photo = request.files.get('profile_photo')
        if photo and photo.filename != '':
            filename = secure_filename(f"photo_{profile.user_id}_{int(datetime.now().timestamp())}_{photo.filename}")
            photo_path = os.path.join(app.static_folder, 'profiles', filename)
            photo.save(photo_path)
            profile.profile_photo_url = f"/profiles/{filename}"
            
        db.session.commit()
        return jsonify({"message": "Student Profile Updated!"}), 200

    # --- UPDATED: Allow Photo Uploads for Teacher ---
    @app.route('/api/admin/edit-teacher/<int:profile_id>', methods=['PUT'])
    @cross_origin(origins='*')
    @jwt_required()
    def admin_edit_teacher(profile_id):
        if get_jwt().get('role') != 'Admin': return jsonify({"message": "Forbidden"}), 403
        profile = TeacherProfile.query.get(profile_id)
        if not profile: return jsonify({"message": "Teacher Profile not found"}), 404
        user = User.query.get(profile.user_id)
        
        data = request.form if request.form else request.get_json(silent=True) or {}
        
        profile.assigned_batch = data.get('assigned_batch', profile.assigned_batch)
        profile.assigned_branch = data.get('assigned_branch', profile.assigned_branch)
        profile.advisor_role = data.get('advisor_role', profile.advisor_role)
        
        photo = request.files.get('profile_photo')
        if photo and photo.filename != '':
            filename = secure_filename(f"photo_{user.id}_{int(datetime.now().timestamp())}_{photo.filename}")
            photo_path = os.path.join(app.static_folder, 'profiles', filename)
            photo.save(photo_path)
            
            if hasattr(profile, 'profile_photo_url'):
                profile.profile_photo_url = f"/profiles/{filename}"
            elif hasattr(user, 'profile_photo_url'):
                user.profile_photo_url = f"/profiles/{filename}"
                
        db.session.commit()
        return jsonify({"message": "Teacher Profile Updated!"}), 200

    # --- NEW: Edit TPO Profile Route (Photos) ---
    @app.route('/api/admin/edit-tpo/<int:user_id>', methods=['PUT'])
    @cross_origin(origins='*')
    @jwt_required()
    def admin_edit_tpo(user_id):
        if get_jwt().get('role') != 'Admin': return jsonify({"message": "Forbidden"}), 403
        user = User.query.get(user_id)
        if not user or user.role != 'TPO': return jsonify({"message": "TPO not found"}), 404
        
        photo = request.files.get('profile_photo')
        if photo and photo.filename != '':
            filename = secure_filename(f"photo_{user.id}_{int(datetime.now().timestamp())}_{photo.filename}")
            photo_path = os.path.join(app.static_folder, 'profiles', filename)
            photo.save(photo_path)
            
            if hasattr(user, 'profile_photo_url'):
                user.profile_photo_url = f"/profiles/{filename}"
                
        db.session.commit()
        return jsonify({"message": "TPO Profile Updated!"}), 200

    @app.route('/api/admin/delete-user/<int:user_id>', methods=['DELETE'])
    @cross_origin(origins='*')
    @jwt_required()
    def admin_delete_user(user_id):
        if get_jwt().get('role') != 'Admin':
            return jsonify({"message": "Forbidden"}), 403

        user_to_delete = User.query.get(user_id)
        if not user_to_delete:
            return jsonify({"message": "User not found"}), 404

        current_username = get_jwt_identity()
        if user_to_delete.username == current_username:
            return jsonify({"message": "Action Blocked: You cannot delete your own Superuser Admin account."}), 400

        db.session.delete(user_to_delete)
        db.session.commit()
        return jsonify({"message": f"User '{user_to_delete.username}' has been permanently deleted."}), 200

    @app.route('/api/admin/bulk-upload', methods=['POST'])
    @cross_origin(origins='*')
    @jwt_required()
    def admin_bulk_upload():
        if get_jwt().get('role') != 'Admin':
            return jsonify({"message": "Forbidden"}), 403
            
        file = request.files.get('file')
        if not file or not file.filename.endswith('.csv'):
            return jsonify({"message": "Please upload a valid .csv file."}), 400
            
        # Retrieve any attached photo files and map them by filename
        photos = request.files.getlist('photos')
        photo_map = {p.filename: p for p in photos if p.filename}
            
        try:
            import csv
            import io
            stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
            csv_input = csv.DictReader(stream)
            
            success_count = 0
            error_list = []
            
            for row in csv_input:
                username = row.get('username')
                email = row.get('email')
                password = row.get('password', 'Pass@123')
                full_name = row.get('full_name')
                batch = row.get('batch')
                branch = row.get('branch')
                gender = row.get('gender')
                program_duration = row.get('program_duration')
                photo_filename = row.get('photo_filename', '').strip()
                
                if not all([username, email, full_name, batch, branch, gender, program_duration]):
                    error_list.append(f"Missing fields for {username or email or 'Row'}")
                    continue
                    
                if User.query.filter_by(username=username).first() or User.query.filter_by(email=email).first():
                    error_list.append(f"Username '{username}' or email '{email}' already exists.")
                    continue
                    
                new_user = User(username=username, email=email, role='Student', status='approved')
                new_user.set_password(password)
                db.session.add(new_user)
                db.session.flush() 
                
                # Check if a matching photo was uploaded
                profile_photo_url = None
                if photo_filename and photo_filename in photo_map:
                    photo_file = photo_map[photo_filename]
                    filename = secure_filename(f"photo_{new_user.id}_{int(datetime.now().timestamp())}_{photo_file.filename}")
                    photo_path = os.path.join(app.static_folder, 'profiles', filename)
                    
                    photo_file.seek(0)
                    photo_file.save(photo_path)
                    profile_photo_url = f"/profiles/{filename}"
                
                new_profile = StudentProfile(
                    user_id=new_user.id,
                    full_name=full_name,
                    batch=batch,
                    branch=branch,
                    gender=gender,
                    program_duration=int(program_duration),
                    verification_status='Approved', 
                    sgpa_history={},
                    active_backlogs=0,
                    profile_photo_url=profile_photo_url 
                )
                db.session.add(new_profile)
                success_count += 1
                
            db.session.commit() 
            
            return jsonify({
                "message": f"Successfully created {success_count} student profiles.", 
                "errors": error_list
            }), 200
            
        except Exception as e:
            return jsonify({"message": "Failed to process CSV file.", "stack": str(e)}), 500

    return app