import React, { useState, useEffect } from 'react'
import { communicationAPI } from '../api/api'

function StudentCard({ student, onClose }) {
  const [contactInfo, setContactInfo] = useState(null)
  const [showEmailModal, setShowEmailModal] = useState(false)

  useEffect(() => {
    loadContactInfo()
  }, [student.id])

  const loadContactInfo = async () => {
    try {
      const response = await communicationAPI.getContactInfo(student.id)
      setContactInfo(response.data)
    } catch (error) {
      console.error('Ошибка загрузки контактов:', error)
    }
  }

  const openEmailService = (service, email) => {
    const encodedEmail = encodeURIComponent(email)

    if (service === 'gmail') {
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodedEmail}`, '_blank', 'noopener,noreferrer')
      return
    }

    if (service === 'mailru') {
      window.open(`https://e.mail.ru/compose/?to=${encodedEmail}`, '_blank', 'noopener,noreferrer')
      return
    }

    window.location.href = `mailto:${email}`
  }

  const handlePhoneClick = (phone) => {
    window.location.href = `tel:${phone.replace(/\s/g, '')}`
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Карточка студента</h3>
        <button className="btn btn-secondary" onClick={onClose}>
          Закрыть
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>ФИО:</strong> {student.full_name}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Email:</strong> {student.email}
        <div className="contact-links">
          <button
            className="btn btn-small btn-primary"
            onClick={() => setShowEmailModal(true)}
          >
            Написать письмо
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Телефон:</strong> {student.phone}
        <div className="contact-links">
          <button
            className="btn btn-small btn-primary"
            onClick={() => handlePhoneClick(student.phone)}
          >
            📞 Позвонить
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Школа:</strong> {student.school_name}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Желаемый курс:</strong> {student.desired_course_name || 'Не указан'}
      </div>

      <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #ddd' }}>
        <h4>Контактная информация родителя</h4>
        <div style={{ marginTop: '10px' }}>
          <strong>ФИО родителя:</strong> {student.parent_name}
        </div>
        <div style={{ marginTop: '10px' }}>
          <strong>Телефон родителя:</strong> {student.parent_phone}
          <div className="contact-links">
            <button
              className="btn btn-small btn-primary"
              onClick={() => handlePhoneClick(student.parent_phone)}
            >
              📞 Позвонить родителю
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
        <div>Дата создания: {new Date(student.created_at).toLocaleString('ru-RU')}</div>
        {student.updated_at && (
          <div>Последнее обновление: {new Date(student.updated_at).toLocaleString('ru-RU')}</div>
        )}
      </div>

      {showEmailModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h2>Отправить письмо</h2>
              <button className="close-btn" onClick={() => setShowEmailModal(false)}>
                ×
              </button>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '6px' }}>Адрес получателя</div>
              <div><strong>{student.email}</strong></div>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              <button
                className="btn btn-primary"
                onClick={() => openEmailService('gmail', student.email)}
              >
                Открыть в Gmail
              </button>
              <button
                className="btn btn-primary"
                onClick={() => openEmailService('mailru', student.email)}
              >
                Открыть в Mail.ru
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => openEmailService('default', student.email)}
              >
                Открыть в почтовом клиенте
              </button>
            </div>

            <div className="actions" style={{ marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setShowEmailModal(false)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentCard
