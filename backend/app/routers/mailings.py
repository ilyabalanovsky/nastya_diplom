from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app import schemas
from app.database import get_db
from app.models import Stream
from app.services.email_sender import EmailSender

router = APIRouter()


def _render_template(template: str, context: dict[str, str]) -> str:
    rendered = template
    for key, value in context.items():
        rendered = rendered.replace(f"{{{{{key}}}}}", value)
    return rendered


@router.post("/stream", response_model=schemas.StreamMailingResult)
def send_stream_mailing(
    mailing: schemas.StreamMailingRequest,
    db: Session = Depends(get_db),
):
    stream = (
        db.query(Stream)
        .options(joinedload(Stream.students), joinedload(Stream.course))
        .filter(Stream.id == mailing.stream_id)
        .first()
    )
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    if not stream.students:
        raise HTTPException(status_code=400, detail="There are no students in this stream")

    sender = EmailSender()
    try:
        sender.validate_configuration()
    except ValueError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    sent_count = 0
    failed_recipients: list[schemas.StreamMailingFailure] = []
    skipped_count = 0

    for student in stream.students:
        if not student.email:
            skipped_count += 1
            continue

        context = {
            "student_name": student.full_name,
            "stream_name": stream.name,
            "course_name": stream.course.name if stream.course else "",
            "school_name": student.school_name,
            "parent_name": student.parent_name,
        }
        subject = _render_template(mailing.subject, context)
        body = _render_template(mailing.message, context)

        try:
            sender.send_email(student.email, subject, body)
            sent_count += 1
        except Exception as error:
            failed_recipients.append(
                schemas.StreamMailingFailure(
                    student_id=student.id,
                    student_name=student.full_name,
                    email=student.email,
                    error=str(error),
                )
            )

    return schemas.StreamMailingResult(
        stream_id=stream.id,
        stream_name=stream.name,
        total_recipients=len(stream.students),
        sent_count=sent_count,
        skipped_count=skipped_count,
        failed_count=len(failed_recipients),
        failed_recipients=failed_recipients,
    )
