from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from app import schemas
from app.database import get_db
from app.models import Stream, Student, Course

router = APIRouter()


@router.get("/", response_model=List[schemas.StreamSummary])
def get_streams(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    streams = (
        db.query(Stream)
        .options(joinedload(Stream.students))
        .offset(skip)
        .limit(limit)
        .all()
    )
    result = []
    for stream in streams:
        data = schemas.StreamSummary.model_validate(stream).model_dump()
        data["student_count"] = len(stream.students)
        result.append(data)
    return result


@router.get("/course/{course_id}", response_model=List[schemas.Stream])
def get_streams_by_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course.streams


@router.get("/{stream_id}", response_model=schemas.StreamWithStudents)
def get_stream(stream_id: int, db: Session = Depends(get_db)):
    stream = db.query(Stream).filter(Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    return stream


@router.post("/", response_model=schemas.Stream)
def create_stream(stream: schemas.StreamCreate, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == stream.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    db_stream = Stream(**stream.model_dump())
    db.add(db_stream)
    db.commit()
    db.refresh(db_stream)
    return db_stream


@router.put("/{stream_id}", response_model=schemas.Stream)
def update_stream(stream_id: int, stream: schemas.StreamUpdate, db: Session = Depends(get_db)):
    db_stream = db.query(Stream).filter(Stream.id == stream_id).first()
    if not db_stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    if stream.course_id:
        course = db.query(Course).filter(Course.id == stream.course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
    
    update_data = stream.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_stream, field, value)
    
    db.commit()
    db.refresh(db_stream)
    return db_stream


@router.delete("/{stream_id}")
def delete_stream(stream_id: int, db: Session = Depends(get_db)):
    db_stream = db.query(Stream).filter(Stream.id == stream_id).first()
    if not db_stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    db.delete(db_stream)
    db.commit()
    return {"message": "Stream deleted successfully"}


@router.post("/enroll", response_model=schemas.StreamWithStudents)
def enroll_student(enrollment: schemas.EnrollStudent, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == enrollment.student_id).first()
    stream = db.query(Stream).filter(Stream.id == enrollment.stream_id).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    if student in stream.students:
        raise HTTPException(status_code=400, detail="Student already enrolled in this stream")
    
    stream.students.append(student)
    db.commit()
    db.refresh(stream)
    return stream


@router.post("/unenroll", response_model=schemas.StreamWithStudents)
def unenroll_student(enrollment: schemas.UnenrollStudent, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == enrollment.student_id).first()
    stream = db.query(Stream).filter(Stream.id == enrollment.stream_id).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    if student not in stream.students:
        raise HTTPException(status_code=400, detail="Student is not enrolled in this stream")
    
    stream.students.remove(student)
    db.commit()
    db.refresh(stream)
    return stream
