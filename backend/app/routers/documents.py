from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
from urllib.parse import quote
from app.database import get_db
from app.models import Student, Course, Stream
from app.services.document_generator import DocumentGenerator
from pydantic import BaseModel

router = APIRouter()

def build_content_disposition(filename: str) -> str:
    safe_ascii = "document.docx"
    quoted = quote(filename)
    return f"attachment; filename=\"{safe_ascii}\"; filename*=UTF-8''{quoted}"


class EnrollmentOrderRequest(BaseModel):
    stream_id: int
    student_ids: List[int]
    order_number: Optional[str] = None
    order_date: Optional[datetime] = None


class UnenrollmentOrderRequest(BaseModel):
    stream_id: int
    student_ids: List[int]
    reason: Optional[str] = None
    order_number: Optional[str] = None
    order_date: Optional[datetime] = None


class PaymentMemoRequest(BaseModel):
    stream_id: int
    instructor_name: str
    hours: float
    rate_per_hour: float
    total_amount: Optional[float] = None
    memo_date: Optional[datetime] = None


class AccessPassRequest(BaseModel):
    student_id: int
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    pass_date: Optional[datetime] = None


@router.post("/enrollment-order")
async def generate_enrollment_order(
    request: EnrollmentOrderRequest,
    db: Session = Depends(get_db)
):
    stream = db.query(Stream).filter(Stream.id == request.stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    course = db.query(Course).filter(Course.id == stream.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    students = db.query(Student).filter(Student.id.in_(request.student_ids)).all()
    if len(students) != len(request.student_ids):
        raise HTTPException(status_code=400, detail="Some students not found")
    
    students_data = [
        {
            "full_name": s.full_name,
            "school_name": s.school_name,
            "email": s.email,
            "phone": s.phone
        }
        for s in students
    ]
    
    order_date = request.order_date or datetime.now()
    order_number = request.order_number or f"№ {order_date.strftime('%Y-%m-%d-%H%M')}"
    enroll_date = order_date
    students_lines = "\n".join(
        [f"{idx}. {s['full_name']} - {s['school_name']}" for idx, s in enumerate(students_data, 1)]
    )

    template_path = os.getenv(
        "ENROLLMENT_TEMPLATE_PATH",
        os.path.join(os.path.dirname(__file__), "template.docx"),
    )
    if not os.path.isfile(template_path):
        raise HTTPException(
            status_code=400,
            detail=f"Шаблон не найден: {template_path}",
        )

    mapping = {
        "{{ORDER_DATE}}": order_date.strftime("%d.%m.%Y"),
        "{{ORDER_NUMBER}}": order_number,
        "{{ENROLL_DATE}}": enroll_date.strftime("%d.%m.%Y"),
        "{{PROGRAM_NAME}}": course.name,
        "{{STUDENTS_LIST}}": students_lines,
    }

    buffer = DocumentGenerator.generate_enrollment_order_from_template(
        template_path=template_path,
        mapping=mapping,
    )

    filename = f"Приказ_о_зачислении_{course.name}_{stream.name}_{order_date.strftime('%Y%m%d')}.docx"
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": build_content_disposition(filename)}
    )


@router.post("/unenrollment-order")
async def generate_unenrollment_order(
    request: UnenrollmentOrderRequest,
    db: Session = Depends(get_db)
):
    stream = db.query(Stream).filter(Stream.id == request.stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    course = db.query(Course).filter(Course.id == stream.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    students = db.query(Student).filter(Student.id.in_(request.student_ids)).all()
    if len(students) != len(request.student_ids):
        raise HTTPException(status_code=400, detail="Some students not found")
    
    for student in students:
        if student not in stream.students:
            raise HTTPException(
                status_code=400,
                detail=f"Student {student.full_name} is not enrolled in this stream"
            )
    
    students_data = [
        {
            "full_name": s.full_name,
            "school_name": s.school_name,
            "email": s.email,
            "phone": s.phone
        }
        for s in students
    ]
    
    buffer = DocumentGenerator.generate_unenrollment_order(
        course_name=course.name,
        stream_name=stream.name,
        students=students_data,
        reason=request.reason,
        order_number=request.order_number,
        order_date=request.order_date
    )
    
    filename = f"Приказ_об_отчислении_{course.name}_{stream.name}_{datetime.now().strftime('%Y%m%d')}.docx"
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": build_content_disposition(filename)}
    )


@router.post("/payment-memo")
async def generate_payment_memo(
    request: PaymentMemoRequest,
    db: Session = Depends(get_db)
):
    stream = db.query(Stream).filter(Stream.id == request.stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    course = db.query(Course).filter(Course.id == stream.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    buffer = DocumentGenerator.generate_payment_memo(
        course_name=course.name,
        stream_name=stream.name,
        instructor_name=request.instructor_name,
        hours=request.hours,
        rate_per_hour=request.rate_per_hour,
        total_amount=request.total_amount,
        memo_date=request.memo_date
    )
    
    filename = f"Служебка_на_оплату_{course.name}_{stream.name}_{datetime.now().strftime('%Y%m%d')}.docx"
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": build_content_disposition(filename)}
    )


@router.post("/access-pass")
async def generate_access_pass(
    request: AccessPassRequest,
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == request.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    stream = None
    course = None
    if student.streams:
        stream = student.streams[0]
        course = db.query(Course).filter(Course.id == stream.course_id).first()
    
    if not stream:
        course_name = student.desired_course_name or "Не указан"
        stream_name = "Не указан"
    else:
        course_name = course.name if course else "Не указан"
        stream_name = stream.name
    
    buffer = DocumentGenerator.generate_access_pass(
        student_name=student.full_name,
        student_school=student.school_name,
        course_name=course_name,
        stream_name=stream_name,
        parent_name=student.parent_name,
        parent_phone=student.parent_phone,
        valid_from=request.valid_from,
        valid_to=request.valid_to,
        pass_date=request.pass_date
    )
    
    filename = f"Служебная_пропуск_{student.full_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.docx"
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": build_content_disposition(filename)}
    )
