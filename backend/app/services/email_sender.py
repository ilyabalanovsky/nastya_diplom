import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid


def _parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class EmailSender:
    def __init__(self) -> None:
        self.host = os.getenv("SMTP_HOST", "")
        self.port = int(os.getenv("SMTP_PORT", "587"))
        self.username = os.getenv("SMTP_USERNAME", "")
        self.password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("SMTP_FROM_EMAIL", self.username)
        self.from_name = os.getenv("SMTP_FROM_NAME", "")
        self.local_hostname = os.getenv(
            "SMTP_LOCAL_HOSTNAME",
            self.from_email.split("@")[-1] if "@" in self.from_email else None,
        )
        self.use_tls = _parse_bool(os.getenv("SMTP_USE_TLS"), default=True)
        self.use_ssl = _parse_bool(os.getenv("SMTP_USE_SSL"), default=False)

    def validate_configuration(self) -> None:
        if not self.host:
            raise ValueError("SMTP_HOST is not configured")
        if not self.from_email:
            raise ValueError("SMTP_FROM_EMAIL is not configured")
        if self.use_ssl and self.use_tls:
            raise ValueError("SMTP_USE_SSL and SMTP_USE_TLS cannot both be enabled")
        if self.username and not self.password:
            raise ValueError("SMTP_PASSWORD is not configured")

    def _build_message(self, recipient_email: str, subject: str, body: str) -> EmailMessage:
        message = EmailMessage()
        message["To"] = recipient_email
        message["Subject"] = subject
        message["From"] = formataddr((self.from_name, self.from_email)) if self.from_name else self.from_email
        message["Date"] = formatdate(localtime=True)
        message["Message-ID"] = make_msgid(domain=self.from_email.split("@")[-1])
        message["Reply-To"] = self.from_email
        message.set_content(body)
        return message

    def _send_message(self, server: smtplib.SMTP, message: EmailMessage) -> None:
        refused_recipients = server.send_message(message)
        if refused_recipients:
            details = "; ".join(
                f"{email}: {error}"
                for email, error in refused_recipients.items()
            )
            raise smtplib.SMTPRecipientsRefused(refused_recipients) from RuntimeError(
                f"SMTP refused recipients: {details}"
            )

    def send_email(self, recipient_email: str, subject: str, body: str) -> None:
        self.validate_configuration()
        message = self._build_message(recipient_email, subject, body)
        context = ssl.create_default_context()

        if self.use_ssl:
            with smtplib.SMTP_SSL(
                self.host,
                self.port,
                local_hostname=self.local_hostname,
                context=context,
                timeout=30,
            ) as server:
                if self.username:
                    server.login(self.username, self.password)
                self._send_message(server, message)
            return

        with smtplib.SMTP(
            self.host,
            self.port,
            local_hostname=self.local_hostname,
            timeout=30,
        ) as server:
            server.ehlo()
            if self.use_tls:
                server.starttls(context=context)
                server.ehlo()
            if self.username:
                server.login(self.username, self.password)
            self._send_message(server, message)
