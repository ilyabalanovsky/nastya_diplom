from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from datetime import datetime
from io import BytesIO
from typing import List, Dict, Optional


class DocumentGenerator:
    @staticmethod
    def _apply_font(doc: Document, font_name: str, font_size: int) -> None:
        style = doc.styles['Normal']
        style.font.name = font_name
        style.font.size = Pt(font_size)

        def apply_to_run(run):
            run.font.name = font_name
            run.font.size = Pt(font_size)
            r_pr = run._element.get_or_add_rPr()
            r_fonts = r_pr.get_or_add_rFonts()
            r_fonts.set(qn('w:ascii'), font_name)
            r_fonts.set(qn('w:hAnsi'), font_name)
            r_fonts.set(qn('w:eastAsia'), font_name)
            r_fonts.set(qn('w:cs'), font_name)

        for paragraph in doc.paragraphs:
            for run in paragraph.runs:
                apply_to_run(run)

        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        for run in paragraph.runs:
                            apply_to_run(run)


    @staticmethod
    def _replace_placeholders(doc: Document, mapping: Dict[str, str]) -> None:
        def replace_in_paragraph(paragraph):
            if not paragraph.runs:
                return
            original = "".join(run.text for run in paragraph.runs)
            if not original:
                return
            updated = original
            for key, value in mapping.items():
                updated = updated.replace(key, value)
            if updated == original:
                return
            for run in paragraph.runs:
                run.text = ""
            paragraph.add_run(updated)

        for paragraph in doc.paragraphs:
            replace_in_paragraph(paragraph)

        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        replace_in_paragraph(paragraph)

    @staticmethod
    def generate_enrollment_order_from_template(
        template_path: str,
        mapping: Dict[str, str],
    ) -> BytesIO:
        doc = Document(template_path)
        DocumentGenerator._replace_placeholders(doc, mapping)
        DocumentGenerator._apply_font(doc, "Times New Roman", 14)
        buffer = BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def generate_enrollment_order(
        course_name: str,
        stream_name: str,
        students: List[Dict],
        order_number: Optional[str] = None,
        order_date: Optional[datetime] = None
    ) -> BytesIO:
        doc = Document()
        style = doc.styles['Normal']
        font = style.font
        font.name = 'Times New Roman'
        font.size = Pt(14)
        heading = doc.add_heading('ПРИКАЗ', 0)
        heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if not order_number:
            order_number = f"№ {datetime.now().strftime('%Y-%m-%d-%H%M')}"
        if not order_date:
            order_date = datetime.now()
        date_para = doc.add_paragraph()
        date_para.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        date_para.add_run(f'от {order_date.strftime("%d.%m.%Y")} г.')
        doc.add_paragraph()
        para = doc.add_paragraph()
        para.add_run('О зачислении школьников на образовательный курс').bold = True
        doc.add_paragraph()
        para = doc.add_paragraph()
        para.add_run(f'В соответствии с заявлениями родителей (законных представителей) и на основании решения приемной комиссии')
        para = doc.add_paragraph()
        para.add_run('ПРИКАЗЫВАЮ:').bold = True
        para = doc.add_paragraph()
        para.add_run(f'Зачислить на курс "{course_name}", поток "{stream_name}" следующих школьников:')
        doc.add_paragraph()
        for idx, student in enumerate(students, 1):
            para = doc.add_paragraph(style='List Number')
            run = para.runs[0] if para.runs else para.add_run()
            run.text = f'{idx}. {student.get("full_name", "")} - {student.get("school_name", "")}'
        doc.add_paragraph()
        para = doc.add_paragraph()
        para.add_run(f'Всего зачислено: {len(students)} человек')
        doc.add_paragraph()
        doc.add_paragraph()
        para = doc.add_paragraph()
        para.add_run('Руководитель образовательной программы')
        para.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        buffer = BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def generate_unenrollment_order(
        course_name: str,
        stream_name: str,
        students: List[Dict],
        reason: Optional[str] = None,
        order_number: Optional[str] = None,
        order_date: Optional[datetime] = None
    ) -> BytesIO:
        doc = Document()
        style = doc.styles['Normal']
        font = style.font
        font.name = 'Times New Roman'
        font.size = Pt(14)
        heading = doc.add_heading('ПРИКАЗ', 0)
        heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if not order_number:
            order_number = f"№ {datetime.now().strftime('%Y-%m-%d-%H%M')}"
        if not order_date:
            order_date = datetime.now()
        date_para = doc.add_paragraph()
        date_para.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        date_para.add_run(f'от {order_date.strftime("%d.%m.%Y")} г.')
        doc.add_paragraph()
        para = doc.add_paragraph()
        para.add_run('Об отчислении школьников с образовательного курса').bold = True
        doc.add_paragraph()
        para = doc.add_paragraph()
        para.add_run(f'В связи с {reason or "личными обстоятельствами"} и на основании заявлений родителей (законных представителей)')
        para = doc.add_paragraph()
        para.add_run('ПРИКАЗЫВАЮ:').bold = True
        para = doc.add_paragraph()
        para.add_run(f'Отчислить с курса "{course_name}", поток "{stream_name}" следующих школьников:')
        doc.add_paragraph()
        for idx, student in enumerate(students, 1):
            para = doc.add_paragraph(style='List Number')
            run = para.runs[0] if para.runs else para.add_run()
            run.text = f'{idx}. {student.get("full_name", "")} - {student.get("school_name", "")}'
        doc.add_paragraph()
        para = doc.add_paragraph()
        para.add_run(f'Всего отчислено: {len(students)} человек')
        doc.add_paragraph()
        doc.add_paragraph()
        para = doc.add_paragraph()
        para.add_run('Руководитель образовательной программы')
        para.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        buffer = BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def generate_payment_memo(
        course_name: str,
        stream_name: str,
        instructor_name: str,
        hours: float,
        rate_per_hour: float,
        total_amount: Optional[float] = None,
        memo_date: Optional[datetime] = None
    ) -> BytesIO:
        doc = Document()
        style = doc.styles['Normal']
        font = style.font
        font.name = 'Times New Roman'
        font.size = Pt(14)
        
        heading = doc.add_heading('СЛУЖЕБНАЯ ЗАПИСКА', 0)
        heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        if not memo_date:
            memo_date = datetime.now()
        
        date_para = doc.add_paragraph()
        date_para.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        date_para.add_run(f'от {memo_date.strftime("%d.%m.%Y")} г.')
        
        doc.add_paragraph()
        para = doc.add_paragraph()
        para.add_run('на оплату сотрудникам вуза').bold = True
        
        doc.add_paragraph()
        para = doc.add_paragraph()
        para.add_run('Прошу произвести оплату за проведение занятий по образовательной программе:')
        
        doc.add_paragraph()
        
        table = doc.add_table(rows=5, cols=2)
        table.style = 'Light Grid Accent 1'
        data = [
            ('Курс:', course_name),
            ('Поток:', stream_name),
            ('Преподаватель:', instructor_name),
            ('Количество часов:', str(hours)),
            ('Ставка за час (руб.):', f'{rate_per_hour:,.2f}'),
        ]
        
        for i, (label, value) in enumerate(data):
            table.rows[i].cells[0].text = label
            table.rows[i].cells[1].text = value
        
        doc.add_paragraph()
        para = doc.add_paragraph()
        if not total_amount:
            total_amount = hours * rate_per_hour
        para.add_run(f'Итого к оплате: {total_amount:,.2f} руб.').bold = True
        
        doc.add_paragraph()
        doc.add_paragraph()
        para = doc.add_paragraph()
        para.add_run('Руководитель образовательной программы')
        para.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        buffer = BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def generate_access_pass(
        student_name: str,
        student_school: str,
        course_name: str,
        stream_name: str,
        parent_name: str,
        parent_phone: str,
        valid_from: Optional[datetime] = None,
        valid_to: Optional[datetime] = None,
        pass_date: Optional[datetime] = None
    ) -> BytesIO:
        doc = Document()
        style = doc.styles['Normal']
        font = style.font
        font.name = 'Times New Roman'
        font.size = Pt(14)
        heading = doc.add_heading('СЛУЖЕБНАЯ ЗАПИСКА', 0)
        heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        if not pass_date:
            pass_date = datetime.now()
        
        date_para = doc.add_paragraph()
        date_para.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        date_para.add_run(f'от {pass_date.strftime("%d.%m.%Y")} г.')
        
        doc.add_paragraph()
        para = doc.add_paragraph()
        para.add_run('на пропуск в вуз').bold = True
        
        doc.add_paragraph()
        para = doc.add_paragraph()
        para.add_run('Прошу выдать пропуск для посещения занятий следующему школьнику:')
        
        doc.add_paragraph()
        
        table = doc.add_table(rows=7, cols=2)
        table.style = 'Light Grid Accent 1'
        
        if not valid_from:
            valid_from = datetime.now()
        if not valid_to:
            from datetime import timedelta
            valid_to = valid_from + timedelta(days=365)
        data = [
            ('ФИО школьника:', student_name),
            ('Школа:', student_school),
            ('Курс:', course_name),
            ('Поток:', stream_name),
            ('ФИО родителя:', parent_name),
            ('Телефон родителя:', parent_phone),
            ('Пропуск действителен:', f'с {valid_from.strftime("%d.%m.%Y")} по {valid_to.strftime("%d.%m.%Y")}'),
        ]
        
        for i, (label, value) in enumerate(data):
            table.rows[i].cells[0].text = label
            table.rows[i].cells[1].text = value
        
        doc.add_paragraph()
        doc.add_paragraph()
        para = doc.add_paragraph()
        para.add_run('Руководитель образовательной программы')
        para.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        buffer = BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer
