from __future__ import annotations

from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime


class StudentBase(BaseModel):
    full_name: str
    phone: str
    email: EmailStr
    school_name: str
    parent_name: str
    parent_phone: str
    desired_course_name: Optional[str] = None


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    school_name: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    desired_course_name: Optional[str] = None


class Student(StudentBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CourseBase(BaseModel):
    name: str
    description: Optional[str] = None


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class Course(CourseBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CourseSummary(Course):
    stream_count: int = 0

    class Config:
        from_attributes = True


class CourseWithStreams(Course):
    streams: List[Stream] = []
    
    model_config = ConfigDict(from_attributes=True)


class StreamBase(BaseModel):
    name: str
    course_id: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class StreamCreate(StreamBase):
    pass


class StreamUpdate(BaseModel):
    name: Optional[str] = None
    course_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class Stream(StreamBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StreamSummary(Stream):
    student_count: int = 0

    class Config:
        from_attributes = True


class StreamWithStudents(Stream):
    students: List[Student] = []


class EnrollStudent(BaseModel):
    student_id: int
    stream_id: int


class UnenrollStudent(BaseModel):
    student_id: int
    stream_id: int


class StreamMailingRequest(BaseModel):
    stream_id: int
    subject: str
    message: str


class StreamMailingFailure(BaseModel):
    student_id: int
    student_name: str
    email: EmailStr
    error: str


class StreamMailingResult(BaseModel):
    stream_id: int
    stream_name: str
    total_recipients: int
    sent_count: int
    skipped_count: int
    failed_count: int
    failed_recipients: List[StreamMailingFailure] = []


CourseWithStreams.model_rebuild()
StreamWithStudents.model_rebuild()
