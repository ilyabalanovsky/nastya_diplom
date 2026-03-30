from datetime import datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.document_generator import DocumentGenerator
from app.services.document_payload_builder import DocumentPayloadBuilder

router = APIRouter()


def build_content_disposition(filename: str) -> str:
    safe_ascii = "document.docx"
    quoted = quote(filename)
    return f"attachment; filename=\"{safe_ascii}\"; filename*=UTF-8''{quoted}"


def build_docx_response(buffer, filename: str) -> StreamingResponse:
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": build_content_disposition(filename)},
    )


class EnrollmentOrderRequest(BaseModel):
    stream_id: int
    student_ids: list[int]
    order_number: str | None = None
    order_date: datetime | None = None
    enroll_date: datetime | None = None


class UnenrollmentOrderRequest(BaseModel):
    stream_id: int
    student_ids: list[int]
    order_number: str | None = None
    order_date: datetime | None = None
    unenroll_date: datetime | None = None


class PaymentRowRequest(BaseModel):
    employee_name: str
    employee_position: str
    hours: float = Field(gt=0)
    rate_per_hour: float = Field(gt=0)


class PaymentMemoRequest(BaseModel):
    stream_id: int
    order_number: str | None = None
    order_date: datetime | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    payments: list[PaymentRowRequest] = Field(min_length=1)


class AccessPassRequest(BaseModel):
    stream_id: int
    student_ids: list[int]
    order_number: str | None = None
    order_date: datetime | None = None
    start_date: datetime | None = None


@router.post("/enrollment-order")
async def generate_enrollment_order(
    request: EnrollmentOrderRequest,
    db: Session = Depends(get_db),
):
    prepared = DocumentPayloadBuilder.prepare_enrollment_order(
        db=db,
        stream_id=request.stream_id,
        student_ids=request.student_ids,
        order_number=request.order_number,
        order_date=request.order_date,
        enroll_date=request.enroll_date,
    )
    buffer = DocumentGenerator.generate_from_template(
        template_path=prepared.template_path,
        mapping=prepared.mapping,
    )
    return build_docx_response(buffer, prepared.filename)


@router.post("/unenrollment-order")
async def generate_unenrollment_order(
    request: UnenrollmentOrderRequest,
    db: Session = Depends(get_db),
):
    prepared = DocumentPayloadBuilder.prepare_unenrollment_order(
        db=db,
        stream_id=request.stream_id,
        student_ids=request.student_ids,
        order_number=request.order_number,
        order_date=request.order_date,
        unenroll_date=request.unenroll_date,
    )
    buffer = DocumentGenerator.generate_from_template(
        template_path=prepared.template_path,
        mapping=prepared.mapping,
    )
    return build_docx_response(buffer, prepared.filename)


@router.post("/payment-memo")
async def generate_payment_memo(
    request: PaymentMemoRequest,
    db: Session = Depends(get_db),
):
    prepared = DocumentPayloadBuilder.prepare_payment_memo(
        db=db,
        stream_id=request.stream_id,
        order_number=request.order_number,
        order_date=request.order_date,
        start_date=request.start_date,
        end_date=request.end_date,
        payments=request.payments,
    )
    buffer = DocumentGenerator.generate_payment_memo_from_template(
        template_path=prepared.template_path,
        mapping=prepared.mapping,
        payment_rows=prepared.payment_rows,
        total_hours=prepared.total_hours,
        total_amount=prepared.total_amount,
        total_amount_text=prepared.total_amount_text,
    )
    return build_docx_response(buffer, prepared.filename)


@router.post("/access-pass")
async def generate_access_pass(
    request: AccessPassRequest,
    db: Session = Depends(get_db),
):
    prepared = DocumentPayloadBuilder.prepare_access_pass(
        db=db,
        stream_id=request.stream_id,
        student_ids=request.student_ids,
        order_number=request.order_number,
        order_date=request.order_date,
        start_date=request.start_date,
    )
    buffer = DocumentGenerator.generate_from_template(
        template_path=prepared.template_path,
        mapping=prepared.mapping,
    )
    return build_docx_response(buffer, prepared.filename)
