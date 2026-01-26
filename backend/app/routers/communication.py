from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Student

router = APIRouter()


@router.get("/student/{student_id}/contact-info")
def get_student_contact_info(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return {
        "student": {
            "email": student.email,
            "phone": student.phone,
            "full_name": student.full_name
        },
        "parent": {
            "name": student.parent_name,
            "phone": student.parent_phone
        }
    }


@router.get("/student/{student_id}/email-link")
def get_email_link(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return {
        "email": student.email,
        "mailto_link": f"mailto:{student.email}",
        "parent_email": None
    }


@router.get("/student/{student_id}/phone-link")
def get_phone_link(student_id: int, contact_type: str = "student", db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if contact_type == "parent":
        phone = student.parent_phone
        name = student.parent_name
    else:
        phone = student.phone
        name = student.full_name
    
    clean_phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    
    return {
        "phone": phone,
        "name": name,
        "tel_link": f"tel:{clean_phone}"
    }
