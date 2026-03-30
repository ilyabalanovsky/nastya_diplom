import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Course, Stream, Student
from app.services.document_generator import DocumentGenerator

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "routers" / "templates"
ENROLLMENT_TEMPLATE_PATH = os.getenv("ENROLLMENT_TEMPLATE_PATH", str(TEMPLATES_DIR / "enroll.docx"))
UNENROLLMENT_TEMPLATE_PATH = os.getenv("UNENROLLMENT_TEMPLATE_PATH", str(TEMPLATES_DIR / "unenroll.docx"))
PAYMENT_TEMPLATE_PATH = os.getenv("PAYMENT_TEMPLATE_PATH", str(TEMPLATES_DIR / "payment.docx"))
ACCESS_PASS_TEMPLATE_PATH = os.getenv("ACCESS_PASS_TEMPLATE_PATH", str(TEMPLATES_DIR / "pass.docx"))


@dataclass
class PreparedTemplateDocument:
    template_path: str
    filename: str
    mapping: dict[str, str]


@dataclass
class PreparedPaymentDocument(PreparedTemplateDocument):
    payment_rows: list[dict[str, str]]
    total_hours: str
    total_amount: str
    total_amount_text: str


class DocumentPayloadBuilder:
    @staticmethod
    def _ensure_template_exists(template_path: str) -> str:
        if not os.path.isfile(template_path):
            raise HTTPException(status_code=400, detail=f"Шаблон не найден: {template_path}")
        return template_path

    @staticmethod
    def _get_stream_or_404(db: Session, stream_id: int) -> Stream:
        stream = db.query(Stream).filter(Stream.id == stream_id).first()
        if not stream:
            raise HTTPException(status_code=404, detail="Stream not found")
        return stream

    @staticmethod
    def _get_course_or_404(db: Session, course_id: int) -> Course:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        return course

    @staticmethod
    def _get_students_or_404(db: Session, student_ids: list[int]) -> list[Student]:
        students = db.query(Student).filter(Student.id.in_(student_ids)).all()
        if len(students) != len(student_ids):
            raise HTTPException(status_code=400, detail="Some students not found")
        students_by_id = {student.id: student for student in students}
        return [students_by_id[student_id] for student_id in student_ids]

    @staticmethod
    def _ensure_students_in_stream(stream: Stream, students: list[Student]) -> None:
        stream_student_ids = {student.id for student in stream.students}
        invalid_student = next((student for student in students if student.id not in stream_student_ids), None)
        if invalid_student:
            raise HTTPException(
                status_code=400,
                detail=f"Student {invalid_student.full_name} is not enrolled in this stream",
            )

    @staticmethod
    def _format_date(value: datetime | None, fallback: str = "") -> str:
        if not value:
            return fallback
        return value.strftime("%d.%m.%Y")

    @staticmethod
    def prepare_enrollment_order(
        db: Session,
        stream_id: int,
        student_ids: list[int],
        order_number: str | None,
        order_date: datetime | None,
        enroll_date: datetime | None,
    ) -> PreparedTemplateDocument:
        stream = DocumentPayloadBuilder._get_stream_or_404(db, stream_id)
        course = DocumentPayloadBuilder._get_course_or_404(db, stream.course_id)
        students = DocumentPayloadBuilder._get_students_or_404(db, student_ids)
        DocumentPayloadBuilder._ensure_students_in_stream(stream, students)

        resolved_order_date = order_date or datetime.now()
        resolved_order_number = order_number or resolved_order_date.strftime("%Y-%m-%d-%H%M")
        resolved_enroll_date = enroll_date or resolved_order_date
        students_lines = "\n".join(
            f"{idx}. {student.full_name} - {student.school_name}"
            for idx, student in enumerate(students, 1)
        )

        return PreparedTemplateDocument(
            template_path=DocumentPayloadBuilder._ensure_template_exists(ENROLLMENT_TEMPLATE_PATH),
            filename=f"Приказ_о_зачислении_{course.name}_{stream.name}_{resolved_order_date.strftime('%Y%m%d')}.docx",
            mapping={
                "{{ORDER_DATE}}": DocumentPayloadBuilder._format_date(resolved_order_date),
                "{{ORDER_NUMBER}}": resolved_order_number,
                "{{ENROLL_DATE}}": DocumentPayloadBuilder._format_date(resolved_enroll_date),
                "{{PROGRAM_NAME}}": course.name,
                "{{STUDENTS_LIST}}": students_lines,
            },
        )

    @staticmethod
    def prepare_unenrollment_order(
        db: Session,
        stream_id: int,
        student_ids: list[int],
        order_number: str | None,
        order_date: datetime | None,
        unenroll_date: datetime | None,
    ) -> PreparedTemplateDocument:
        stream = DocumentPayloadBuilder._get_stream_or_404(db, stream_id)
        course = DocumentPayloadBuilder._get_course_or_404(db, stream.course_id)
        students = DocumentPayloadBuilder._get_students_or_404(db, student_ids)
        DocumentPayloadBuilder._ensure_students_in_stream(stream, students)

        resolved_order_date = order_date or datetime.now()
        resolved_order_number = order_number or resolved_order_date.strftime("%Y-%m-%d-%H%M")
        resolved_unenroll_date = unenroll_date or resolved_order_date
        students_lines = "\n".join(
            f"{idx}. {student.full_name} - {student.school_name}"
            for idx, student in enumerate(students, 1)
        )

        return PreparedTemplateDocument(
            template_path=DocumentPayloadBuilder._ensure_template_exists(UNENROLLMENT_TEMPLATE_PATH),
            filename=f"Приказ_об_отчислении_{course.name}_{stream.name}_{resolved_order_date.strftime('%Y%m%d')}.docx",
            mapping={
                "{{ORDER_DATE}}": DocumentPayloadBuilder._format_date(resolved_order_date),
                "{{ORDER_NUMBER}}": resolved_order_number,
                "{{UNENROLL_DATE}}": DocumentPayloadBuilder._format_date(resolved_unenroll_date),
                "{{COURSE_NAME}}": course.name,
                "{{STUDENTS_LIST}}": students_lines,
            },
        )

    @staticmethod
    def prepare_payment_memo(
        db: Session,
        stream_id: int,
        order_number: str | None,
        order_date: datetime | None,
        start_date: datetime | None,
        end_date: datetime | None,
        payments: list[object],
    ) -> PreparedPaymentDocument:
        stream = DocumentPayloadBuilder._get_stream_or_404(db, stream_id)
        course = DocumentPayloadBuilder._get_course_or_404(db, stream.course_id)

        resolved_order_date = order_date or datetime.now()
        resolved_order_number = order_number or resolved_order_date.strftime("%Y-%m-%d-%H%M")
        resolved_start_date = start_date or stream.start_date
        resolved_end_date = end_date or stream.end_date

        payment_rows: list[dict[str, str]] = []
        total_hours = 0.0
        total_amount = 0.0

        for payment in payments:
            amount = payment.hours * payment.rate_per_hour
            total_hours += payment.hours
            total_amount += amount
            payment_rows.append(
                {
                    "{{NAME}}": payment.employee_name,
                    "{{POSITION}}": payment.employee_position,
                    "{{HOUR_RUB}}": DocumentGenerator.format_number(payment.rate_per_hour),
                    "{{HOURS}}": DocumentGenerator.format_number(payment.hours),
                    "{{SUM}}": DocumentGenerator.format_number(amount),
                }
            )

        total_amount_decimal = DocumentGenerator.to_decimal(total_amount)

        return PreparedPaymentDocument(
            template_path=DocumentPayloadBuilder._ensure_template_exists(PAYMENT_TEMPLATE_PATH),
            filename=f"Служебка_на_оплату_{course.name}_{stream.name}_{resolved_order_date.strftime('%Y%m%d')}.docx",
            mapping={
                "{{ORDER_DATE}}": DocumentPayloadBuilder._format_date(resolved_order_date),
                "{{ORDER_NUMBER}}": resolved_order_number,
                "{{COURSE_NAME}}": course.name,
                "{{START}}": DocumentPayloadBuilder._format_date(resolved_start_date),
                "{{END}}": DocumentPayloadBuilder._format_date(resolved_end_date),
            },
            payment_rows=payment_rows,
            total_hours=DocumentGenerator.format_number(total_hours),
            total_amount=DocumentGenerator.format_number(total_amount_decimal),
            total_amount_text=DocumentGenerator.format_rub_amount_text(total_amount_decimal),
        )

    @staticmethod
    def prepare_access_pass(
        db: Session,
        stream_id: int,
        student_ids: list[int],
        order_number: str | None,
        order_date: datetime | None,
        start_date: datetime | None,
    ) -> PreparedTemplateDocument:
        stream = DocumentPayloadBuilder._get_stream_or_404(db, stream_id)
        course = DocumentPayloadBuilder._get_course_or_404(db, stream.course_id)
        students = DocumentPayloadBuilder._get_students_or_404(db, student_ids)
        DocumentPayloadBuilder._ensure_students_in_stream(stream, students)

        resolved_order_date = order_date or datetime.now()
        resolved_order_number = order_number or resolved_order_date.strftime("%Y-%m-%d-%H%M")
        resolved_start_date = start_date or stream.start_date
        students_lines = "\n".join(
            f"{idx}. {student.full_name}"
            for idx, student in enumerate(students, 1)
        )

        return PreparedTemplateDocument(
            template_path=DocumentPayloadBuilder._ensure_template_exists(ACCESS_PASS_TEMPLATE_PATH),
            filename=f"Служебная_записка_на_пропуск_{course.name}_{stream.name}_{resolved_order_date.strftime('%Y%m%d')}.docx",
            mapping={
                "{{ORDER_DATE}}": DocumentPayloadBuilder._format_date(resolved_order_date),
                "{{ORDER_NUMBER}}": resolved_order_number,
                "{{START}}": DocumentPayloadBuilder._format_date(resolved_start_date),
                "{{COURSE_NAME}}": course.name,
                "{{STUDENTS_LIST}}": students_lines,
            },
        )
