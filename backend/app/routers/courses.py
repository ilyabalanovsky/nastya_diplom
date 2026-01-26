from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from app import schemas
from app.database import get_db
from app.models import Course, Stream

router = APIRouter()


@router.get("/", response_model=List[schemas.CourseSummary])
def get_courses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    courses = (
        db.query(Course)
        .options(joinedload(Course.streams))
        .offset(skip)
        .limit(limit)
        .all()
    )
    result = []
    for course in courses:
        data = schemas.CourseSummary.model_validate(course).model_dump()
        data["stream_count"] = len(course.streams)
        result.append(data)
    return result


@router.get("/{course_id}", response_model=schemas.CourseWithStreams)
def get_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.post("/", response_model=schemas.Course)
def create_course(course: schemas.CourseCreate, db: Session = Depends(get_db)):
    existing_course = db.query(Course).filter(Course.name == course.name).first()
    if existing_course:
        raise HTTPException(status_code=400, detail="Course with this name already exists")
    
    db_course = Course(**course.model_dump())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course


@router.put("/{course_id}", response_model=schemas.Course)
def update_course(course_id: int, course: schemas.CourseUpdate, db: Session = Depends(get_db)):
    db_course = db.query(Course).filter(Course.id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course.name and course.name != db_course.name:
        existing_course = db.query(Course).filter(Course.name == course.name).first()
        if existing_course:
            raise HTTPException(status_code=400, detail="Course with this name already exists")
    
    update_data = course.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_course, field, value)
    
    db.commit()
    db.refresh(db_course)
    return db_course


@router.delete("/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db)):
    db_course = db.query(Course).filter(Course.id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    db.delete(db_course)
    db.commit()
    return {"message": "Course deleted successfully"}
